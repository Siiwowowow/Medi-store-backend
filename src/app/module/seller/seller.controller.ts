import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { SellerService } from "./seller.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";

const getSellerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await SellerService.getSellerProfile(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Seller profile fetched successfully",
    data: result,
  });
});

// 👇 NEW: Get All Sellers Together
const getAllSellers = catchAsync(async (req: Request, res: Response) => {
  const result = await SellerService.getAllSellers(req.query);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "All sellers fetched successfully",
    data: result.sellers,
    meta: result.meta,
  });
});

const getPendingSellers = catchAsync(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  
  const result = await SellerService.getPendingSellers(page, limit);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Pending sellers fetched successfully",
    data: result.sellers,
    meta: result.meta,
  });
});

const getApprovedSellers = catchAsync(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  
  const result = await SellerService.getApprovedSellers(page, limit);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Approved sellers fetched successfully",
    data: result.sellers,
    meta: result.meta,
  });
});

const approveSeller = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const sellerId = getParamId(req.params.id);
  const result = await SellerService.approveSeller(sellerId, user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Seller approved successfully",
    data: result,
  });
});

const rejectSeller = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const sellerId = getParamId(req.params.id);
  const result = await SellerService.rejectSeller(sellerId, user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Seller rejected successfully",
    data: result,
  });
});

export const SellerController = {
  getSellerProfile,
  getAllSellers,      // 👈 NEW
  getPendingSellers,
  getApprovedSellers,
  approveSeller,
  rejectSeller,
};