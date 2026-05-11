/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { OrderService } from "./order.service.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";
import { getParamId } from "../../utils/param.utils.js";
import { QueryBuilder } from "../../utils/queryBuilder.js";
import { prisma } from "../../lib/prisma.js";

const createOrder = catchAsync(async (req: any, res: any) => {
  const user = req.user as IRequestUser;
  const result = await OrderService.createOrder(user.userId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.CREATED,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req: any, res: any) => {
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

const getOrderDetails = catchAsync(async (req: any, res: any) => {
  const user = req.user as IRequestUser;
  const orderId = getParamId(req.params.id);
  
  let customerUserId;
  let sellerUserId;
  
  if (user.role === 'CUSTOMER') {
    customerUserId = user.userId;
  } else if (user.role === 'SELLER') {
    sellerUserId = user.userId;
  }
  
  const result = await OrderService.getOrderById(orderId, customerUserId, sellerUserId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order details fetched successfully",
    data: result,
  });
});

const cancelOrder = catchAsync(async (req: any, res: any) => {
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

const getSellerOrders = catchAsync(async (req: any, res: any) => {
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

const updateOrderStatus = catchAsync(async (req: any, res: any) => {
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

const getOrderStats = catchAsync(async (req: any, res: any) => {
  const user = req.user as IRequestUser;
  const result = await OrderService.getOrderStats(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order stats fetched successfully",
    data: result,
  });
});

const getAllOrders = catchAsync(async (req: any, res: any) => {
  const queryBuilder = new QueryBuilder(
    prisma.order,
    req.query,
    {
      searchableFields: ["orderNumber", "customerName", "customerEmail"],
      filterableFields: ["status", "customerId"]
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
            select: { name: true, email: true }
          }
        }
      },
      items: {
        include: {
          medicine: {
            select: { name: true, price: true, image: true }
          }
        }
      }
    })
    .execute();

  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "All orders fetched successfully",
    data: result.data,
    meta: result.meta,
  });
});

const adminUpdateOrderStatus = catchAsync(async (req: any, res: any) => {
  const orderId = getParamId(req.params.id);
  const result = await OrderService.adminUpdateOrderStatus(orderId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Order status updated successfully",
    data: result,
  });
});

export const OrderController = {
  createOrder,
  getMyOrders,
  getOrderDetails,
  cancelOrder,
  getSellerOrders,
  updateOrderStatus,
  adminUpdateOrderStatus,
  getOrderStats,
  getAllOrders,
};
