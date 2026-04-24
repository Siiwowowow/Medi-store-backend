import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CartService } from "./cart.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";

const getCart = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
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
  const itemId = getParamId(req.params.itemId);
  const result = await CartService.updateCartItem(user.userId, itemId, req.body);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Cart updated successfully",
    data: result,
  });
});

const removeFromCart = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const itemId = getParamId(req.params.itemId);
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