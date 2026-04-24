/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateMedicinePayload, IMedicineFilters, IUpdateMedicinePayload } from "./medicine.interface";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "../../config/cloudinary.config";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// ✅ Upload medicine image to Cloudinary
const uploadMedicineImage = async (file: Express.Multer.File): Promise<string> => {
  const uploadResult = await uploadFileToCloudinary(file.buffer, file.originalname);
  return uploadResult.secure_url;
};

// ✅ Delete medicine image from Cloudinary
const deleteMedicineImage = async (imageUrl: string): Promise<void> => {
  if (imageUrl) {
    try {
      await deleteFileFromCloudinary(imageUrl);
    } catch (error) {
      console.error("Failed to delete old image:", error);
    }
  }
};

const createMedicine = async (
  sellerUserId: string, 
  payload: ICreateMedicinePayload, 
  imageFile?: Express.Multer.File
) => {
  // Check if seller exists and is approved
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Only sellers can add medicines");
  }
  
  if (!seller.isApproved) {
    throw new AppError(status.FORBIDDEN, "Your seller account is pending admin approval. Please wait for approval before adding medicines.");
  }
  
  // ✅ Upload image if provided
  let imageUrl: string | undefined = payload.image;
  if (imageFile) {
    imageUrl = await uploadMedicineImage(imageFile);
  }
  
  const slug = generateSlug(payload.name);
  
  const existing = await prisma.medicine.findFirst({
    where: { slug }
  });
  
  if (existing) {
    throw new AppError(status.CONFLICT, "Medicine with similar name already exists");
  }
  
  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId }
    });
    if (!category) {
      throw new AppError(status.NOT_FOUND, "Category not found");
    }
  }
  
  return prisma.medicine.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      price: payload.price,
      stock: payload.stock,
      manufacturer: payload.manufacturer,
      genericName: payload.genericName,
      dosageForm: payload.dosageForm,
      strength: payload.strength,
      categoryId: payload.categoryId,
      image: imageUrl,
      sellerId: seller.id,
    },
    include: {
      category: true,
    }
  });
};

const getAllMedicines = async (filters: IMedicineFilters) => {
  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const skip = (page - 1) * limit;
  
  const where: any = {
    isActive: true,
  };
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { manufacturer: { contains: filters.search, mode: 'insensitive' } },
      { genericName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  
  if (filters.minPrice !== undefined) {
    where.price = { gte: filters.minPrice };
  }
  
  if (filters.maxPrice !== undefined) {
    where.price = { ...where.price, lte: filters.maxPrice };
  }
  
  if (filters.manufacturer) {
    where.manufacturer = filters.manufacturer;
  }
  
  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { reviews: true }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicine.count({ where }),
  ]);
  
  // Calculate average rating for each medicine
  const medicinesWithRating = await Promise.all(
    medicines.map(async (medicine) => {
      const reviews = await prisma.review.aggregate({
        where: { medicineId: medicine.id },
        _avg: { rating: true },
        _count: true,
      });
      
      return {
        ...medicine,
        price: medicine.price.toNumber(),
        avgRating: reviews._avg.rating || 0,
        reviewCount: reviews._count,
      };
    })
  );
  
  return {
    medicines: medicinesWithRating,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getMedicineById = async (id: string) => {
  const medicine = await prisma.medicine.findUnique({
    where: { id },
    include: {
      category: true,
      seller: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      },
      reviews: {
        include: {
          customer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }
    }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }
  
  const ratingAgg = await prisma.review.aggregate({
    where: { medicineId: medicine.id },
    _avg: { rating: true },
    _count: true,
  });
  
  return {
    ...medicine,
    price: medicine.price.toNumber(),
    avgRating: ratingAgg._avg.rating || 0,
    reviewCount: ratingAgg._count,
  };
};

const getMedicineBySlug = async (slug: string) => {
  const medicine = await prisma.medicine.findUnique({
    where: { slug },
    include: {
      category: true,
      seller: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      },
      reviews: {
        include: {
          customer: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }
  
  return {
    ...medicine,
    price: medicine.price.toNumber(),
  };
};

const updateMedicine = async (
  sellerUserId: string, 
  medicineId: string, 
  payload: IUpdateMedicinePayload,
  imageFile?: Express.Multer.File
) => {
  // Get seller
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Only sellers can update medicines");
  }
  
  const medicine = await prisma.medicine.findFirst({
    where: {
      id: medicineId,
      sellerId: seller.id,
    }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found or you don't have permission");
  }
  
  let slug = medicine.slug;
  if (payload.name && payload.name !== medicine.name) {
    slug = generateSlug(payload.name);
    
    const existing = await prisma.medicine.findFirst({
      where: { slug, id: { not: medicineId } }
    });
    
    if (existing) {
      throw new AppError(status.CONFLICT, "Medicine with this name already exists");
    }
  }
  
  // ✅ Handle image update
  let imageUrl = medicine.image;
  if (imageFile) {
    // Delete old image
    if (medicine.image) {
      await deleteMedicineImage(medicine.image);
    }
    // Upload new image
    imageUrl = await uploadMedicineImage(imageFile);
  } else if (payload.image === null) {
    // Remove image
    if (medicine.image) {
      await deleteMedicineImage(medicine.image);
    }
    imageUrl = null;
  } else if (payload.image) {
    imageUrl = payload.image;
  }
  
  if (payload.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: payload.categoryId }
    });
    if (!category) {
      throw new AppError(status.NOT_FOUND, "Category not found");
    }
  }
  
  return prisma.medicine.update({
    where: { id: medicineId },
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      price: payload.price,
      stock: payload.stock,
      manufacturer: payload.manufacturer,
      genericName: payload.genericName,
      dosageForm: payload.dosageForm,
      strength: payload.strength,
      categoryId: payload.categoryId,
      isActive: payload.isActive,
      image: imageUrl,
    },
    include: {
      category: true,
    }
  });
};

const deleteMedicine = async (sellerUserId: string, medicineId: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Only sellers can delete medicines");
  }
  
  const medicine = await prisma.medicine.findFirst({
    where: {
      id: medicineId,
      sellerId: seller.id,
    },
    include: {
      orderItems: { take: 1 }
    }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found or you don't have permission");
  }
  
  // ✅ Delete image from Cloudinary
  if (medicine.image) {
    await deleteMedicineImage(medicine.image);
  }
  
  if (medicine.orderItems.length > 0) {
    // Soft delete - just mark as inactive
    return prisma.medicine.update({
      where: { id: medicineId },
      data: { isActive: false }
    });
  }
  
  return prisma.medicine.delete({
    where: { id: medicineId }
  });
};

const getSellerMedicines = async (sellerUserId: string, filters: IMedicineFilters) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Seller not found");
  }
  
  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = {
    sellerId: seller.id,
  };
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { manufacturer: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }
  
  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      include: {
        category: true,
        _count: {
          select: { orderItems: true }
        }
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.medicine.count({ where }),
  ]);
  
  const formattedMedicines = medicines.map(m => ({
    ...m,
    price: m.price.toNumber(),
  }));
  
  return {
    medicines: formattedMedicines,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getManufacturers = async () => {
  const manufacturers = await prisma.medicine.findMany({
    where: { isActive: true },
    select: { manufacturer: true },
    distinct: ['manufacturer'],
    orderBy: { manufacturer: 'asc' }
  });
  
  return manufacturers.map(m => m.manufacturer);
};

const getMedicineStats = async (sellerUserId: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId }
  });
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Seller not found");
  }
  
  const [totalMedicines, activeMedicines, lowStockCount, totalOrders] = await Promise.all([
    prisma.medicine.count({ where: { sellerId: seller.id } }),
    prisma.medicine.count({ where: { sellerId: seller.id, isActive: true } }),
    prisma.medicine.count({ where: { sellerId: seller.id, stock: { lt: 10 } } }),
    prisma.orderItem.count({
      where: {
        medicine: { sellerId: seller.id }
      }
    }),
  ]);
  
  return {
    totalMedicines,
    activeMedicines,
    lowStockCount,
    totalOrders,
  };
};

export const MedicineService = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  getMedicineBySlug,
  updateMedicine,
  deleteMedicine,
  getSellerMedicines,
  getManufacturers,
  getMedicineStats,
  uploadMedicineImage,
  deleteMedicineImage,
};