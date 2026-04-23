import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CategoryService } from "./category.service";
import { getParamId } from "../../utils/param.utils";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(req.body);
  
  sendResponse(res, {
    httpCode: status.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';
  const result = await CategoryService.getAllCategories(includeInactive);
  
  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Categories fetched successfully",
    data: result,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
    const id = getParamId(req.params.id);
  const result = await CategoryService.getCategoryById(id);
  
  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Category fetched successfully",
    data: result,
  });
});

const getCategoryBySlug = catchAsync(async (req: Request, res: Response) => {
    const id = getParamId(req.params.slug);
  const result = await CategoryService.getCategoryBySlug(id);
  
  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Category fetched successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  const result = await CategoryService.updateCategory(id, req.body);
  
  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
    const id = getParamId(req.params.id);
  const result = await CategoryService.deleteCategory(id);
  
  sendResponse(res, {
    httpCode: status.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
};