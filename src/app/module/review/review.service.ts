// @ts-nocheck
import status from "http-status";
import AppError from "../../errorHelpers/AppError.js";
import { prisma } from "../../lib/prisma.js";
import { ICreateReviewPayload, IUpdateReviewPayload } from "./review.interface.js";

const createReview = async (customerUserId: string, payload: ICreateReviewPayload) => {
  const { medicineId, rating, comment, orderId } = payload;
  
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Only customers can write reviews");
  }
  
  if (rating < 1 || rating > 5) {
    throw new AppError(status.BAD_REQUEST, "Rating must be between 1 and 5");
  }
  
  // Check if customer has purchased this medicine
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      medicineId,
      order: {
        customerId: customer.id,
        status: 'DELIVERED',
      }
    }
  });
  
  if (!hasPurchased) {
    throw new AppError(status.FORBIDDEN, "You can only review medicines you have purchased and received");
  }
  
  // Check if already reviewed
  const existingReview = await prisma.review.findUnique({
    where: {
      customerId_medicineId: {
        customerId: customer.id,
        medicineId,
      }
    }
  });
  
  if (existingReview) {
    throw new AppError(status.CONFLICT, "You have already reviewed this medicine");
  }
  
  return prisma.review.create({
    data: {
      rating,
      comment,
      customerId: customer.id,
      medicineId,
      orderId,
    },
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
    }
  });
};

const getMedicineReviews = async (medicineId: string, page: number = 1, limit: number = 10) => {
  const skip = (page - 1) * limit;
  
  const [reviews, total, ratingAgg] = await Promise.all([
    prisma.review.findMany({
      where: { medicineId },
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
      skip,
      take: limit,
    }),
    prisma.review.count({ where: { medicineId } }),
    prisma.review.aggregate({
      where: { medicineId },
      _avg: { rating: true },
      _count: true,
    }),
  ]);
  
  return {
    reviews,
    stats: {
      averageRating: ratingAgg._avg.rating || 0,
      totalReviews: ratingAgg._count,
    },
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const updateReview = async (reviewId: string, customerUserId: string, payload: IUpdateReviewPayload) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      customerId: customer.id,
    }
  });
  
  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found or you don't have permission");
  }
  
  if (payload.rating && (payload.rating < 1 || payload.rating > 5)) {
    throw new AppError(status.BAD_REQUEST, "Rating must be between 1 and 5");
  }
  
  return prisma.review.update({
    where: { id: reviewId },
    data: payload,
  });
};

const deleteReview = async (reviewId: string, customerUserId: string) => {
  const customer = await prisma.customer.findUnique({
    where: { userId: customerUserId }
  });
  
  if (!customer) {
    throw new AppError(status.FORBIDDEN, "Customer not found");
  }
  
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      customerId: customer.id,
    }
  });
  
  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found or you don't have permission");
  }
  
  return prisma.review.delete({
    where: { id: reviewId },
  });
};

const deleteReviewAsAdmin = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId }
  });
  
  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }
  
  return prisma.review.delete({
    where: { id: reviewId },
  });
};

export const ReviewService = {
  createReview,
  getMedicineReviews,
  updateReview,
  deleteReview,
  deleteReviewAsAdmin,
};
