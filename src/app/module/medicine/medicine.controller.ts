import { Request, Response } from "express";
import statusCode from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { MedicineService } from "./medicine.service";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { getParamId } from "../../utils/param.utils";

const createMedicine = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  
  // ✅ Get uploaded file
  const files = req.files as { [fieldName: string]: Express.Multer.File[] } | undefined;
  const imageFile = files?.productPhoto?.[0] || files?.file?.[0];
  
  // ✅ Convert string to number for price and stock
  const payload = {
    ...req.body,
    price: req.body.price ? Number(req.body.price) : undefined,
    stock: req.body.stock ? Number(req.body.stock) : undefined,
  };
  
  // ✅ Remove quotes if present (from form-data)
  if (typeof payload.name === 'string') {
    payload.name = payload.name.replace(/^"|"$/g, '');
  }
  if (typeof payload.description === 'string') {
    payload.description = payload.description.replace(/^"|"$/g, '');
  }
  if (typeof payload.manufacturer === 'string') {
    payload.manufacturer = payload.manufacturer.replace(/^"|"$/g, '');
  }
  
  const result = await MedicineService.createMedicine(user.userId, payload, imageFile);
  
  sendResponse(res, {
    httpCode: statusCode.CREATED,
    success: true,
    message: "Medicine added successfully",
    data: result,
  });
});

const getAllMedicines = catchAsync(async (req: Request, res: Response) => {
  const {
    search,
    categoryId,
    minPrice,
    maxPrice,
    manufacturer,
    page,
    limit,
  } = req.query;
  
  const result = await MedicineService.getAllMedicines({
    search: search as string,
    categoryId: categoryId as string,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    manufacturer: manufacturer as string,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 12,
  });
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicines fetched successfully",
    data: result.medicines,
    meta: result.meta,
  });
});

const getMedicineById = catchAsync(async (req: Request, res: Response) => {
  const id = getParamId(req.params.id);
  const result = await MedicineService.getMedicineById(id);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicine fetched successfully",
    data: result,
  });
});

const getMedicineBySlug = catchAsync(async (req: Request, res: Response) => {
  const slug = getParamId(req.params.slug);
  const result = await MedicineService.getMedicineBySlug(slug);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicine fetched successfully",
    data: result,
  });
});

const updateMedicine = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const id = getParamId(req.params.id);
  
  // ✅ Get uploaded file
  const files = req.files as { [fieldName: string]: Express.Multer.File[] } | undefined;
  const imageFile = files?.productPhoto?.[0] || files?.file?.[0];
  
  const result = await MedicineService.updateMedicine(user.userId, id, req.body, imageFile);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicine updated successfully",
    data: result,
  });
});

const deleteMedicine = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const id = getParamId(req.params.id);
  const result = await MedicineService.deleteMedicine(user.userId, id);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicine deleted successfully",
    data: result,
  });
});

const getSellerMedicines = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const { search, isActive, page, limit } = req.query;
  
  const result = await MedicineService.getSellerMedicines(user.userId, {
    search: search as string,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    page: page ? Number(page) : 1,
    limit: limit ? Number(limit) : 10,
  });
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicines fetched successfully",
    data: result.medicines,
    meta: result.meta,
  });
});

const getManufacturers = catchAsync(async (req: Request, res: Response) => {
  const result = await MedicineService.getManufacturers();
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Manufacturers fetched successfully",
    data: result,
  });
});

const getMedicineStats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IRequestUser;
  const result = await MedicineService.getMedicineStats(user.userId);
  
  sendResponse(res, {
    httpCode: statusCode.OK,
    success: true,
    message: "Medicine stats fetched successfully",
    data: result,
  });
});

export const MedicineController = {
  createMedicine,
  getAllMedicines,
  getMedicineById,
  getMedicineBySlug,
  updateMedicine,
  deleteMedicine,
  getSellerMedicines,
  getManufacturers,
  getMedicineStats,
};