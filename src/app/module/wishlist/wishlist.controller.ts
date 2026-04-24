import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { WishlistService } from "./wishlist.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";

const getWishlist = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await WishlistService.getWishlist(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Wishlist fetched successfully",
    data: result,
  });
});

const addToWishlist = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const { medicineId } = req.body;
  
  const result = await WishlistService.addToWishlist(user.userId, medicineId);
  
  sendResponse(res, {
    httpCode: statusCode.CREATED,
    success: true,
    message: "Added to wishlist successfully",
    data: result,
  });
});

const removeFromWishlist = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const wishlistId = getParamId(req.params.id);
  
  const result = await WishlistService.removeFromWishlist(user.userId, wishlistId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const clearWishlist = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  const result = await WishlistService.clearWishlist(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const WishlistController = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};