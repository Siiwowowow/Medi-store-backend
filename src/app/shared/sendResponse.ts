/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from "express";

interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface IResponseData<T> {
  httpCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: IPaginationMeta;  // 👈 Add meta property
  error?: string;
}

export const sendResponse = <T>(res: Response, response: IResponseData<T>) => {
  const { httpCode, success, message, data, meta, error } = response;
  
  const responseBody: any = {
    success,
    message,
  };
  
  if (data !== undefined) {
    responseBody.data = data;
  }
  
  if (meta !== undefined) {
    responseBody.meta = meta;  // 👈 Add meta to response
  }
  
  if (error !== undefined) {
    responseBody.error = error;
  }
  
  res.status(httpCode).json(responseBody);
};