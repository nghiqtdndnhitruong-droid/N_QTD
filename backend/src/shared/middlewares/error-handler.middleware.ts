import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCode } from '../errors/error-codes';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { ApiErrorResponse } from '../types/api-response.types';

export const errorHandler: ErrorRequestHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const timestamp = new Date().toISOString();

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${req.method}] ${req.originalUrl} - ${err.message}`, {
        errorCode: err.errorCode,
        stack: err.stack,
      });
    } else {
      logger.warn(`[${req.method}] ${req.originalUrl} - ${err.message}`, {
        errorCode: err.errorCode,
        errors: err.errors,
      });
    }

    const response: ApiErrorResponse = {
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      errors: err.errors,
      timestamp,
      ...(env.nodeEnv === 'development' && { stack: err.stack }),
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Lỗi không xác định hoặc lỗi hệ thống
  logger.error(`[Unhandled Error] [${req.method}] ${req.originalUrl} - ${err.message}`, {
    stack: err.stack,
  });

  const response: ApiErrorResponse = {
    success: false,
    message: env.nodeEnv === 'production' ? 'Đã xảy ra lỗi hệ thống, vui lòng thử lại sau' : err.message,
    errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    timestamp,
    ...(env.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(500).json(response);
};

