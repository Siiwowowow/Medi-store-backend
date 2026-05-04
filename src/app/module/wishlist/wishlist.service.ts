import status from "http-status";
import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";

const getWishlist = async (customerUserId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: customerUserId }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  const wishlist = await prisma.wishlist.findMany({
    where: { customer: { userId: user.id } },
    include: {
      medicine: {
        include: {
          category: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return wishlist.map(item => ({
    id: item.id,
    medicineId: item.medicineId,
    name: item.medicine.name,
    price: item.medicine.price.toNumber(),
    image: item.medicine.image,
    stock: item.medicine.stock,
    category: item.medicine.category?.name || "Medicine",
    description: item.medicine.description,
    createdAt: item.createdAt,
  }));
};

const addToWishlist = async (customerUserId: string, medicineId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  let customer = user.customer;
  if (!customer) {
    customer = await prisma.customer.create({
      data: { userId: user.id }
    });
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
  
  await prisma.wishlist.create({
    data: {
      customerId: customer.id,
      medicineId,
    }
  });
  
  return getWishlist(customerUserId);
};

const removeFromWishlist = async (customerUserId: string, wishlistId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: customerUserId },
    include: { customer: true }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  const customer = user.customer;
  if (!customer) {
    throw new AppError(status.NOT_FOUND, "Customer profile not found");
  }
  
  const wishlistItem = await prisma.wishlist.findFirst({
    where: {
      OR: [
        { id: wishlistId },
        { 
          medicineId: wishlistId, 
          customerId: customer.id 
        }
      ],
      customerId: customer.id,
    }
  });
  
  if (!wishlistItem) {
    console.error(`Wishlist item not found. wishlistId: ${wishlistId}, customerId: ${customer.id}`);
    throw new AppError(status.NOT_FOUND, "Wishlist item not found");
  }
  
  await prisma.wishlist.delete({
    where: { id: wishlistItem.id }
  });
  
  return getWishlist(customerUserId);
};

const clearWishlist = async (customerUserId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: customerUserId }
  });
  
  if (!user) {
    throw new AppError(status.FORBIDDEN, "User not found");
  }
  
  await prisma.wishlist.deleteMany({
    where: { customer: { userId: user.id } }
  });
  
  return { message: "Wishlist cleared successfully" };
};

export const WishlistService = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};