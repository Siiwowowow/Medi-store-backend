// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";

const getSellerProfile = async (sellerUserId: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        }
      }
    }
  });
  
  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }
  
  return seller;
};

// 👇 NEW: Get All Sellers Together (Both Approved & Pending)
const getAllSellers = async (query: any = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  
  const whereCondition: any = {};
  
  if (query.searchTerm) {
    whereCondition.OR = [
      { shopName: { contains: query.searchTerm, mode: 'insensitive' } },
      { shopAddress: { contains: query.searchTerm, mode: 'insensitive' } },
      { user: { name: { contains: query.searchTerm, mode: 'insensitive' } } },
      { user: { email: { contains: query.searchTerm, mode: 'insensitive' } } },
    ];
  }

  if (query.status && query.status !== 'all') {
    whereCondition.isApproved = query.status === 'APPROVED';
  }

  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          }
        },
        _count: {
          select: { medicines: true }
        }
      },
      orderBy: [
        { isApproved: 'desc' },  // Approved first, then pending
        { createdAt: 'desc' }
      ],
      skip,
      take: limit,
    }),
    prisma.seller.count({ where: whereCondition }),
  ]);
  
  // Format sellers with status
  const formattedSellers = sellers.map((seller: any) => ({
    id: seller.id,
    userId: seller.userId,
    shopName: seller.shopName,
    shopAddress: seller.shopAddress,
    phoneNumber: seller.phoneNumber,
    isApproved: seller.isApproved,
    status: seller.isApproved ? 'APPROVED' : 'PENDING',
    totalMedicines: seller._count.medicines,
    user: seller.user,
    createdAt: seller.createdAt,
    updatedAt: seller.updatedAt,
  }));
  
  return {
    sellers: formattedSellers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getPendingSellers = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  
  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where: { isApproved: false },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.seller.count({ where: { isApproved: false } }),
  ]);
  
  return {
    sellers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getApprovedSellers = async (page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  
  const [sellers, total] = await Promise.all([
    prisma.seller.findMany({
      where: { isApproved: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          }
        },
        _count: {
          select: { medicines: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.seller.count({ where: { isApproved: true } }),
  ]);
  
  return {
    sellers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const approveSeller = async (sellerId: string, adminUserId: string) => {
  // Check if admin is SUPER_ADMIN or ADMIN
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true }
  });
  
  if (admin?.role !== 'SUPER_ADMIN' && admin?.role !== 'ADMIN') {
    throw new AppError(status.FORBIDDEN, "Only admins can approve sellers");
  }
  
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: { user: true }
  });
  
  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }
  
  if (seller.isApproved) {
    throw new AppError(status.BAD_REQUEST, "Seller is already approved");
  }
  
  const updatedSeller = await prisma.seller.update({
    where: { id: sellerId },
    data: { isApproved: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });
  
  return updatedSeller;
};

const rejectSeller = async (sellerId: string, adminUserId: string) => {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true }
  });
  
  if (admin?.role !== 'SUPER_ADMIN' && admin?.role !== 'ADMIN') {
    throw new AppError(status.FORBIDDEN, "Only admins can reject sellers");
  }
  
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId }
  });
  
  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }
  
  // Optional: Delete the seller or just mark as rejected
  // Here we delete the seller profile and user account
  await prisma.$transaction(async (tx: any) => {
    await tx.seller.delete({ where: { id: sellerId } });
    await tx.user.delete({ where: { id: seller.userId } });
  });
  
  return { message: "Seller rejected and removed successfully" };
};

const checkSellerApproval = async (sellerUserId: string) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: sellerUserId },
    select: { isApproved: true }
  });
  
  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }
  
  if (!seller.isApproved) {
    throw new AppError(status.FORBIDDEN, "Your seller account is pending admin approval. Please wait for approval.");
  }
  
  return { isApproved: true };
};

export const SellerService = {
  getSellerProfile,
  getAllSellers,        // 👈 NEW
  getPendingSellers,
  getApprovedSellers,
  approveSeller,
  rejectSeller,
  checkSellerApproval,
};
