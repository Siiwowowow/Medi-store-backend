// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
//src>app>medicine>medicine.service.ts
import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateMedicinePayload, IMedicineFilters, IUpdateMedicinePayload } from "./medicine.interface.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "../../config/cloudinary.config.js";

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
  // 1. Run independent checks AND image upload in parallel
  const [seller, existingSlug, category, imageUrl] = await Promise.all([
    prisma.seller.findUnique({ where: { userId: sellerUserId } }),
    prisma.medicine.findUnique({ where: { slug: generateSlug(payload.name) } }),
    payload.categoryId ? prisma.category.findUnique({ where: { id: payload.categoryId } }) : Promise.resolve(true),
    imageFile ? uploadMedicineImage(imageFile) : Promise.resolve(payload.image)
  ]);
  
  if (!seller) {
    throw new AppError(status.FORBIDDEN, "Only sellers can add medicines");
  }
  
  if (!seller.isApproved) {
    throw new AppError(status.FORBIDDEN, "Your seller account is pending admin approval.");
  }
  
  if (existingSlug) {
    throw new AppError(status.CONFLICT, "Medicine with similar name already exists");
  }
  
  if (payload.categoryId && !category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  const slug = generateSlug(payload.name);
  
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
  
  // ... (filtering logic remains the same)
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { manufacturer: { contains: filters.search, mode: 'insensitive' } },
      { genericName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.minPrice !== undefined) where.price = { gte: filters.minPrice };
  if (filters.maxPrice !== undefined) where.price = { ...where.price, lte: filters.maxPrice };
  if (filters.manufacturer) where.manufacturer = filters.manufacturer;
  if (filters.minStock !== undefined) where.stock = { gte: filters.minStock };
  if (filters.stock !== undefined && filters.stock === 0) where.stock = 0;
  
  let orderBy: any = { createdAt: 'desc' };
  if (filters.sortBy === 'price') orderBy = { price: filters.sortOrder || 'asc' };
  else if (filters.sortBy === 'createdAt') orderBy = { createdAt: filters.sortOrder || 'desc' };
  
  const [medicines, total] = await Promise.all([
    prisma.medicine.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true }
        },
        _count: {
          select: { 
            reviews: true,
            orderItems: true
          }
        },
        reviews: {
          select: {
            rating: true
          },
          take: 50 // Limit reviews per product for stats to prevent massive data transfer
        }
      },
      skip,
      take: limit,
      orderBy,
    }),
    prisma.medicine.count({ where }),
  ]);
  
  const medicinesWithStats = medicines.map((medicine) => {
    const ratings = medicine.reviews.map(r => r.rating);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    
    // Remove reviews from the response to save bandwidth
    const { reviews, ...medicineData } = medicine as any;
    
    return {
      ...medicineData,
      price: (medicine.price as any).toNumber(),
      avgRating: Number(avgRating.toFixed(1)),
      reviewCount: medicine._count.reviews,
      orderCount: medicine._count.orderItems,
    };
  });
  
  // ✅ If sorting by avgRating (virtual field), sort in memory
  if (filters.sortBy === 'avgRating') {
    medicinesWithStats.sort((a, b) => {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      return (a.avgRating - b.avgRating) * order;
    });
  }
  
  // ✅ If sorting by orderCount (virtual field), sort in memory
  if (filters.sortBy === 'orderCount') {
    medicinesWithStats.sort((a, b) => {
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      return (a.orderCount - b.orderCount) * order;
    });
  }
  
  return {
    medicines: medicinesWithStats,
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
      },
      _count: {
        select: { orderItems: true }
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
    orderCount: medicine._count.orderItems,
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
      },
      _count: {
        select: { orderItems: true }
      }
    }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }
  
  return {
    ...medicine,
    price: medicine.price.toNumber(),
    orderCount: medicine._count.orderItems,
  };
};

const updateMedicine = async (
  currentUser: IRequestUser, 
  medicineId: string, 
  payload: IUpdateMedicinePayload,
  imageFile?: Express.Multer.File
) => {
  // 1. Run independent checks AND image upload in parallel
  const [medicine, existingWithSlug, category, newImageUrl] = await Promise.all([
    prisma.medicine.findUnique({ where: { id: medicineId } }),
    payload.name ? prisma.medicine.findUnique({ where: { slug: generateSlug(payload.name) } }) : Promise.resolve(null),
    payload.categoryId ? prisma.category.findUnique({ where: { id: payload.categoryId } }) : Promise.resolve(true),
    imageFile ? uploadMedicineImage(imageFile) : Promise.resolve(undefined)
  ]);
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }

  // Check permissions
  if (currentUser.role === 'SELLER') {
    const seller = await prisma.seller.findUnique({ where: { userId: currentUser.userId } });
    if (!seller || medicine.sellerId !== seller.id) {
      throw new AppError(status.FORBIDDEN, "You don't have permission to update this medicine");
    }
  } else if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
    throw new AppError(status.FORBIDDEN, "You don't have permission to update this medicine");
  }
  
  if (existingWithSlug && existingWithSlug.id !== medicineId) {
    throw new AppError(status.CONFLICT, "Medicine with this name already exists");
  }
  
  if (payload.categoryId && !category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }

  // ✅ Handle image update logic
  let finalImageUrl = medicine.image;
  if (newImageUrl) {
    // Delete old image in background (don't await to speed up response)
    if (medicine.image) {
      deleteMedicineImage(medicine.image).catch(err => console.error("Background delete failed:", err));
    }
    finalImageUrl = newImageUrl;
  } else if (payload.image === null) {
    if (medicine.image) {
      deleteMedicineImage(medicine.image).catch(err => console.error("Background delete failed:", err));
    }
    finalImageUrl = null;
  } else if (payload.image) {
    finalImageUrl = payload.image;
  }

  const slug = payload.name ? generateSlug(payload.name) : medicine.slug;
  
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
      image: finalImageUrl,
    },
    include: {
      category: true,
    }
  });
};

const deleteMedicine = async (currentUser: IRequestUser, medicineId: string) => {
  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId },
    include: {
      orderItems: { take: 1 }
    }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }

  // Check permissions
  if (currentUser.role === 'SELLER') {
    const seller = await prisma.seller.findUnique({ where: { userId: currentUser.userId } });
    if (!seller || medicine.sellerId !== seller.id) {
      throw new AppError(status.FORBIDDEN, "You don't have permission to delete this medicine");
    }
  } else if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
    throw new AppError(status.FORBIDDEN, "You don't have permission to delete this medicine");
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
    orderCount: m._count.orderItems,
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
