import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateCategoryPayload, IUpdateCategoryPayload } from "./category.interface";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const createCategory = async (payload: ICreateCategoryPayload) => {
  const slug = generateSlug(payload.name);
  
  const existing = await prisma.category.findFirst({
    where: { name: payload.name }
  });
  
  if (existing) {
    throw new AppError(status.CONFLICT, "Category with this name already exists");
  }
  
  return prisma.category.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      image: payload.image,
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

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
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
  
  return prisma.category.update({
    where: { id },
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      image: payload.image,
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