import { Request, Response } from "express";
import statusCode from "http-status";  // 👈 Rename to statusCode
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { OrderService } from "./order.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await OrderService.createOrder(user.userId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.CREATED,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});
// Add this new function
const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const { status, page, limit } = req.query;
  
  const result = await OrderService.getAllOrders({
    status: status as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "All orders fetched successfully",
    data: result.orders,
    meta: result.meta,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const { status, page, limit } = req.query;
  
  const result = await OrderService.getCustomerOrders(user.userId, {
    status: status as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Orders fetched successfully",
    data: result.orders,
    meta: result.meta,
  });
});

const getOrderDetails = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const orderId = getParamId(req.params.id);
  const result = await OrderService.getOrderById(orderId, user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order details fetched successfully",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const orderId = getParamId(req.params.id);
  const result = await OrderService.cancelOrder(orderId, user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});

const getSellerOrders = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const { status, page, limit } = req.query;
  
  const result = await OrderService.getSellerOrders(user.userId, {
    status: status as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Orders fetched successfully",
    data: result.orders,
    meta: result.meta,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const orderId = getParamId(req.params.id);
  const result = await OrderService.updateOrderStatus(orderId, user.userId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

const getOrderStats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await OrderService.getOrderStats(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order stats fetched successfully",
    data: result,
  });
});

export const OrderController = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getSellerOrders,
  updateOrderStatus,
  getOrderStats,
};