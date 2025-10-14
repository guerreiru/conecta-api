import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors/HttpError";

export const errorMiddleware = (
  err: Error | HttpError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err instanceof HttpError ? err.statusCode : 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    message: message,
  });
};
