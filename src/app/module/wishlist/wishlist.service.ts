import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const getWishlist = async (customerUserId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Only customers can use wishlist");
  }
  
  const wishlist = await prisma.wishlist.findMany({
    where: { customerId: customer.id },
    include: {
      medicine: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          image: true,
          stock: true,
          manufacturer: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return wishlist.map(item => ({
    id: item.id,
    medicineId: item.medicineId,
    medicine: {
      ...item.medicine,
      price: item.medicine.price.toNumber(),
    },
    createdAt: item.createdAt,
  }));
};

const addToWishlist = async (customerUserId: string, medicineId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Only customers can use wishlist");
  }
  
  const medicine = await prisma.medicine.findUnique({
    where: { id: medicineId, isActive: true }
  });
  
  if (!medicine) {
    throw new AppError(status.NOT_FOUND, "Medicine not found");
  }
  
  const existing = await prisma.wishlist.findUnique({
    where: {
      customerId_medicineId: {
        customerId: customer.id,
        medicineId,
      }
    }
  });
  
  if (existing) {
    throw new AppError(status.CONFLICT, "Medicine already in wishlist");
  }
  
  const wishlistItem = await prisma.wishlist.create({
    data: {
      customerId: customer.id,
      medicineId,
    },
    include: {
      medicine: {
        select: {
          id: true,
          name: true,
          price: true,
          image: true,
        }
      }
    }
  });
  
  return {
    id: wishlistItem.id,
    medicineId: wishlistItem.medicineId,
    medicine: {
      ...wishlistItem.medicine,
      price: wishlistItem.medicine.price.toNumber(),
    },
    createdAt: wishlistItem.createdAt,
  };
};

const removeFromWishlist = async (customerUserId: string, wishlistId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const wishlistItem = await prisma.wishlist.findFirst({
    where: {
      id: wishlistId,
      customerId: customer.id,
    }
  });
  
  if (!wishlistItem) {
    throw new AppError(status.NOT_FOUND, "Wishlist item not found");
  }
  
  await prisma.wishlist.delete({
    where: { id: wishlistId }
  });
  
  return { message: "Item removed from wishlist" };
};

const clearWishlist = async (customerUserId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  await prisma.wishlist.deleteMany({
    where: { customerId: customer.id }
  });
  
  return { message: "Wishlist cleared successfully" };
};

export const WishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};