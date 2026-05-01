
//src/app/module/dashboard/dashboard.controller.ts
import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { DashboardService } from "./dashboard.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";

const getAdminDashboard = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAdminDashboardStats();
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Admin dashboard stats fetched successfully",
    data: result,
  });
});

// ==================== SELLER DASHBOARD ====================

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

// Get seller orders with pagination and filters
const getSellerOrders = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const status = req.query.status as string | undefined;
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
  
  const result = await DashboardService.getSellerOrders(
    user.userId, 
    page, 
    limit, 
    status,
    startDate,
    endDate
  );
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Seller orders fetched successfully",
    data: result.orders,
    meta: result.meta,
  });
});

// Get low stock products
const getLowStockProducts = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const threshold = req.query.threshold ? Number(req.query.threshold) : 10;
  
  const result = await DashboardService.getLowStockProducts(user.userId, threshold);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Low stock products fetched successfully",
    data: result,
  });
});

// Get product performance analytics
const getProductPerformance = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const productId = req.query.productId as string | undefined;
  
  const result = await DashboardService.getProductPerformance(user.userId, productId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Product performance fetched successfully",
    data: result,
  });
});

// Get category performance
const getCategoryPerformance = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  // Get seller's medicines first
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId }
  });
  
  if (!seller) {
    return sendResponse(res, {
      httpCode: statusCode.NOT_FOUND,
      success: false,
      message: "Seller not found",
      data: [],
    });
  }
  
  const medicines = await prisma.medicine.findMany({
    where: { sellerId: seller.id },
    select: { id: true }
  });
  
  const medicineIds = medicines.map(m => m.id);
  
  if (medicineIds.length === 0) {
    return sendResponse(res, {
      httpCode: statusCode.OK,
      success: true,
      message: "No products found",
      data: [],
    });
  }
  
  const result = await DashboardService.getCategoryPerformance(medicineIds);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Category performance fetched successfully",
    data: result,
  });
});

export const DashboardController = {
  getAdminDashboard,
  getSellerDashboard,
  getSellerOrders,
  getLowStockProducts,
  getProductPerformance,
  getCategoryPerformance,
};