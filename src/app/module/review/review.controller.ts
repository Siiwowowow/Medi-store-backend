import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";

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
  
  // 👈 Send response directly without sendResponse (to include stats)
  res.status(statusCode.OK).json({
    success: true,
    message: "Reviews fetched successfully",
    data: result.reviews,
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      total: result.meta.total,
      totalPages: result.meta.totalPages,
      stats: result.stats,  // 👈 stats here
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

export const ReviewController = {
  createReview,
  getMedicineReviews,
  updateReview,
  deleteReview,
  deleteReviewAsAdmin,
};