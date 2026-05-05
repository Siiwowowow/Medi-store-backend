/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { CategoryService } from "./category.service";
import { getParamId } from "../../utils/param.utils";
import { QueryBuilder } from "../../utils/queryBuilder";
import { prisma } from "../../lib/prisma";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  // ✅ Get uploaded file
  const files = req.files as { [fieldName: string]: Express.Multer.File[] } | undefined;
  const imageFile = files?.productPhoto?.[0] || files?.file?.[0] || files?.image?.[0];

  // ✅ Clean up payload (handle FormData string values)
  const payload = { ...req.body };
  if (typeof payload.name === 'string') {
    payload.name = payload.name.replace(/^"|"$/g, '');
  }
  if (typeof payload.description === 'string') {
    payload.description = payload.description.replace(/^"|"$/g, '');
  }

  const result = await CategoryService.createCategory(payload, imageFile);
  
  sendResponse(res, {
    httpCode: statusCode.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const includeInactive = req.query.includeInactive === 'true';
  
  const queryBuilder = new QueryBuilder(
    prisma.category,
    req.query,
    {
      searchableFields: ["name", "description"],
      filterableFields: ["isActive"]
    }
  );

  const result = await queryBuilder
    .search()
    .filter()
    .sort()
    .paginate()
    .include({
      _count: {
        select: { medicines: true }
      }
    })
    .execute();

  // Filter by isActive if requested
  let categories = result.data;
  if (!includeInactive) {
    categories = categories.filter((cat: any) => cat.isActive === true);
  }

  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Categories fetched successfully",
    data: categories,
    meta: result.meta,
  });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  const result = await CategoryService.getCategoryById(id);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Category fetched successfully",
    data: result,
  });
});

const getCategoryBySlug = catchAsync(async (req: Request, res: Response) => {
  const slug = getParamId(req.params.slug);
  const result = await CategoryService.getCategoryBySlug(slug);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Category fetched successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);

  // ✅ Get uploaded file
  const files = req.files as { [fieldName: string]: Express.Multer.File[] } | undefined;
  const imageFile = files?.productPhoto?.[0] || files?.file?.[0] || files?.image?.[0];

  // ✅ Clean up payload (handle FormData string values)
  const payload = { ...req.body };
  if (typeof payload.name === 'string') {
    payload.name = payload.name.replace(/^"|"$/g, '');
  }
  if (typeof payload.description === 'string') {
    payload.description = payload.description.replace(/^"|"$/g, '');
  }
  if (payload.isActive !== undefined) {
    payload.isActive = payload.isActive === 'true' ? true : payload.isActive === 'false' ? false : payload.isActive;
  }
  
  if (req.body.removeImage === 'true') {
    payload.image = null;
  }

  const result = await CategoryService.updateCategory(id, payload, imageFile);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  const result = await CategoryService.deleteCategory(id);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
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