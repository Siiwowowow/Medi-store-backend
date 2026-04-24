import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";

const getAdminDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAdminDashboardStats();
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Admin dashboard stats fetched successfully",
    data: result,
  });
});

const getSellerDashboard = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await DashboardService.getSellerDashboardStats(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Seller dashboard stats fetched successfully",
    data: result,
  });
});

export const DashboardController = {
  getAdminDashboard,
  getSellerDashboard,
};