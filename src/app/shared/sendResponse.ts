// @ts-nocheck

/* eslint-disable @typescript-eslint/no-explicit-any */

// ✅ Add stats interface for reviews
interface IReviewStats {
  averageRating: number;
  totalReviews: number;
}

// ✅ Add stats to pagination meta (optional)
interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  stats?: IReviewStats;  // 👈 Add stats as optional property
}

interface IResponseData<T> {
  httpCode: number;
  success: boolean;
  message: string;
  data?: T;
  meta?: IPaginationMeta;
  error?: string;
}

export const sendResponse = <T>(res: any, response: IResponseData<T>) => {
  const { httpCode, success, message, data, meta, error } = response;
  
  const responseBody: any = {
    success,
    message,
  };
  
  if (data !== undefined) {
    responseBody.data = data;
  }
  
  if (meta !== undefined) {
    responseBody.meta = meta;
  }
  
  if (error !== undefined) {
    responseBody.error = error;
  }
  
  res.status(httpCode).json(responseBody);
};
