import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CartService } from "./cart.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";
import AppError from "../../errorHelpers/AppError";

const getCart = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  if (!user || !user.userId) {
    throw new AppError(statusCode.UNAUTHORIZED, "User not authenticated");
  }
  
  const result = await CartService.getCart(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Cart fetched successfully",
    data: result,
  });
});

const addToCart = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  if (!user || !user.userId) {
    throw new AppError(statusCode.UNAUTHORIZED, "User not authenticated");
  }
  
  // Validate request body
  const { medicineId, quantity } = req.body;
  if (!medicineId) {
    throw new AppError(statusCode.BAD_REQUEST, "Medicine ID is required");
  }
  if (!quantity || quantity < 1) {
    throw new AppError(statusCode.BAD_REQUEST, "Quantity must be at least 1");
  }
  
  const result = await CartService.addToCart(user.userId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Item added to cart successfully",
    data: result,
  });
});

const updateCartItem = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  if (!user || !user.userId) {
    throw new AppError(statusCode.UNAUTHORIZED, "User not authenticated");
  }
  
  const itemId = getParamId(req.params.itemId);
  
  // Validate itemId
  if (!itemId) {
    throw new AppError(statusCode.BAD_REQUEST, "Cart item ID is required");
  }
  
  // Validate request body
  const { quantity } = req.body;
  if (quantity === undefined || quantity === null) {
    throw new AppError(statusCode.BAD_REQUEST, "Quantity is required");
  }
  if (typeof quantity !== 'number' || quantity < 0) {
    throw new AppError(statusCode.BAD_REQUEST, "Quantity must be a non-negative number");
  }
  
  const result = await CartService.updateCartItem(user.userId, itemId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: quantity === 0 ? "Item removed from cart" : "Cart updated successfully",
    data: result,
  });
});

const removeFromCart = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  if (!user || !user.userId) {
    throw new AppError(statusCode.UNAUTHORIZED, "User not authenticated");
  }
  
  const itemId = getParamId(req.params.itemId);
  
  // Validate that itemId is not empty
  if (!itemId) {
    throw new AppError(statusCode.BAD_REQUEST, "Item ID is required");
  }
  
  const result = await CartService.removeFromCart(user.userId, itemId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Item removed from cart successfully",
    data: result,
  });
});

const clearCart = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  if (!user || !user.userId) {
    throw new AppError(statusCode.UNAUTHORIZED, "User not authenticated");
  }
  
  const result = await CartService.clearCart(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Cart cleared successfully",
    data: result,
  });
});

export const CartController = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};