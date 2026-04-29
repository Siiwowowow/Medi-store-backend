import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";
import { QueryBuilder } from "../../utils/queryBuilder";
import { prisma } from "../../lib/prisma";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await ReviewService.createReview(user.userId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.CREATED,
    success: true,
    message: "Review added successfully",
    data: result,
  });
});

const getMedicineReviews = catchAsync(async (req: Request, res: Response) => {
  const medicineId = getParamId(req.params.medicineId);
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  
  const result = await ReviewService.getMedicineReviews(medicineId, page, limit);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Reviews fetched successfully",
    data: result.reviews,
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      stats: result.stats,
    },
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const reviewId = getParamId(req.params.id);
  const result = await ReviewService.updateReview(reviewId, user.userId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const reviewId = getParamId(req.params.id);
  const result = await ReviewService.deleteReview(reviewId, user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});

const deleteReviewAsAdmin = catchAsync(async (req: Request, res: Response) => {
  const reviewId = getParamId(req.params.id);
  const result = await ReviewService.deleteReviewAsAdmin(reviewId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Review deleted successfully by admin",
    data: result,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const queryBuilder = new QueryBuilder(
    prisma.review,
    req.query,
    {
      searchableFields: ["comment"],
      filterableFields: ["rating", "medicineId", "customerId"]
    }
  );

  const result = await queryBuilder
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
      customer: {
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        }
      },
      medicine: {
        select: { id: true, name: true, slug: true }
      }
    })
    .execute();

  const ratingAgg = await prisma.review.aggregate({
    _avg: { rating: true },
    _count: true,
  });

  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Reviews fetched successfully",
    data: result.data,
    meta: {
      ...result.meta,
      stats: {
        averageRating: ratingAgg._avg.rating || 0,
        totalReviews: ratingAgg._count,
      },
    },
  });
});

export const ReviewController = {
  createReview,
  getMedicineReviews,
  updateReview,
  deleteReview,
  deleteReviewAsAdmin,
  getAllReviews,
};