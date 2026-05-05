import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { uploadFileToCloudinary, deleteFileFromCloudinary } from "../../config/cloudinary.config";
import { ICreateCategoryPayload, IUpdateCategoryPayload } from "./category.interface";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// ✅ Upload category image to Cloudinary
const uploadCategoryImage = async (file: Express.Multer.File): Promise<string> => {
  const uploadResult = await uploadFileToCloudinary(file.buffer, file.originalname);
  return uploadResult.secure_url;
};

// ✅ Delete category image from Cloudinary
const deleteCategoryImage = async (imageUrl: string): Promise<void> => {
  if (imageUrl) {
    try {
      await deleteFileFromCloudinary(imageUrl);
    } catch (error) {
      console.error("Failed to delete old image:", error);
    }
  }
};

const createCategory = async (payload: ICreateCategoryPayload, imageFile?: Express.Multer.File) => {
  // 1. Run checks and image upload in parallel to save time
  const [existing, imageUrl] = await Promise.all([
    prisma.category.findFirst({ where: { name: payload.name } }),
    imageFile ? uploadCategoryImage(imageFile) : Promise.resolve(payload.image)
  ]);
  
  if (existing) {
    throw new AppError(status.CONFLICT, "Category with this name already exists");
  }

  const slug = generateSlug(payload.name);
  
  return prisma.category.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      image: imageUrl,
    }
  });
};

const getAllCategories = async (includeInactive: boolean = false) => {
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      _count: {
        select: { medicines: true }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  return categories;
};

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      medicines: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          stock: true,
          image: true,
          manufacturer: true,
          description: true,
          _count: {
            select: { reviews: true }
          }
        },
        take: 20,
      },
      _count: {
        select: { medicines: true }
      }
    }
  });
  
  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  
  // Calculate average rating for each medicine
  const medicinesWithRating = await Promise.all(
    (category.medicines || []).map(async (medicine) => {
      const reviews = await prisma.review.aggregate({
        where: { medicineId: medicine.id },
        _avg: { rating: true },
      });
      
      return {
        ...medicine,
        price: medicine.price.toNumber(),
        avgRating: reviews._avg.rating || 0,
      };
    })
  );
  
  return {
    ...category,
    medicines: medicinesWithRating,
  };
};

const getCategoryBySlug = async (slug: string) => {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      medicines: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          stock: true,
          image: true,
          manufacturer: true,
          description: true,
          _count: {
            select: { reviews: true }
          }
        }
      },
      _count: {
        select: { medicines: true }
      }
    }
  });
  
  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  
  // Calculate average rating for each medicine
  const medicinesWithRating = await Promise.all(
    (category.medicines || []).map(async (medicine) => {
      const reviews = await prisma.review.aggregate({
        where: { medicineId: medicine.id },
        _avg: { rating: true },
      });
      
      return {
        ...medicine,
        price: medicine.price.toNumber(),
        avgRating: reviews._avg.rating || 0,
      };
    })
  );
  
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    totalMedicines: category._count.medicines,
    medicines: medicinesWithRating,
  };
};

const updateCategory = async (id: string, payload: IUpdateCategoryPayload, imageFile?: Express.Multer.File) => {
  const category = await prisma.category.findUnique({ where: { id } });
  
  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  
  let slug = category.slug;
  if (payload.name && payload.name !== category.name) {
    slug = generateSlug(payload.name);
    
    const existing = await prisma.category.findFirst({
      where: { slug, id: { not: id } }
    });
    
    if (existing) {
      throw new AppError(status.CONFLICT, "Category with this name already exists");
    }
  }

  // Handle image update
  let finalImageUrl = category.image;
  if (imageFile) {
    // Delete old image in background
    if (category.image) {
      deleteCategoryImage(category.image).catch(err => console.error("Background delete failed:", err));
    }
    finalImageUrl = await uploadCategoryImage(imageFile);
  } else if (payload.image === null) {
    if (category.image) {
      deleteCategoryImage(category.image).catch(err => console.error("Background delete failed:", err));
    }
    finalImageUrl = null;
  }
  
  return prisma.category.update({
    where: { id },
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      image: finalImageUrl,
      isActive: payload.isActive,
    }
  });
};

const deleteCategory = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: { medicines: { take: 1 } }
  });
  
  if (!category) {
    throw new AppError(status.NOT_FOUND, "Category not found");
  }
  
  if (category.medicines.length > 0) {
    throw new AppError(status.BAD_REQUEST, "Cannot delete category with associated medicines");
  }
  
  return prisma.category.delete({ where: { id } });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};