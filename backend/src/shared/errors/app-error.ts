import { ErrorCodeType, ErrorCode } from './error-codes';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCodeType;
  public readonly errors?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 400,
    errorCode: ErrorCodeType = ErrorCode.BAD_REQUEST,
    errors?: unknown
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, errorCode: ErrorCodeType = ErrorCode.BAD_REQUEST, errors?: unknown) {
    return new AppError(message, 400, errorCode, errors);
  }

  static notFound(message: string, errorCode: ErrorCodeType = ErrorCode.NOT_FOUND) {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message: string, errorCode: ErrorCodeType = ErrorCode.CONFLICT, errors?: unknown) {
    return new AppError(message, 409, errorCode, errors);
  }

  static unauthorized(message: string = 'Chưa xác thực quyền truy cập') {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message: string = 'Không có quyền thực hiện hành động này') {
    return new AppError(message, 403, ErrorCode.FORBIDDEN);
  }

  static internal(message: string = 'Đã xảy ra lỗi máy chủ nội bộ') {
    return new AppError(message, 500, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

