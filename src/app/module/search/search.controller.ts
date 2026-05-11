// @ts-nocheck
import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync.js";
import { sendResponse } from "../../shared/sendResponse.js";
import { SearchService } from "./search.service.js";
import { IRequestUser } from "../../interfaces/requestUser.interface.js";

const saveSearch = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const { query } = req.body;
  
  await SearchService.saveSearch(user.userId, query);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Search saved",
    data: null,
  });
});

const getSearchHistory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const limit = req.query.limit ? Number(req.query.limit) : 20;
  
  const result = await SearchService.getSearchHistory(user.userId, limit);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Search history fetched",
    data: result,
  });
});

const clearSearchHistory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  const result = await SearchService.clearSearchHistory(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

const getPopularSearches = catchAsync(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  
  const result = await SearchService.getPopularSearches(limit);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Popular searches fetched",
    data: result,
  });
});

export const SearchController = {
  saveSearch,
  getSearchHistory,
  clearSearchHistory,
  getPopularSearches,
};
