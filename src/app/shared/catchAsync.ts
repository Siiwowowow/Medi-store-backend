import { NextFunction, Request, RequestHandler, Response } from "express";

export const catchAsync = (fn: RequestHandler) => {
  return async(req: Request, res: Response,next:NextFunction) => {
    try {await fn(req, res, next);
      await fn(req, res, next);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error:any) {
    console.error("Error retrieving specialties:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving specialties",
      error: error.message || "Internal Server Error"
    });
    };
  };
};