
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction, RequestHandler } from "express";

export const catchAsync = (fn: any): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
