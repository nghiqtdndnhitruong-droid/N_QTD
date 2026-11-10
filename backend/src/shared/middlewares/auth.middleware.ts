import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config';
import { AppError } from '../errors';
import { authRepository } from '../../modules/auth/auth.repository';
import { authService } from '../../modules/auth/auth.service';
import { AuthUserResponse, Permission, TokenPayload } from '../../modules/auth/auth.types';
import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserResponse;
    }
  }
}

/**
 * Middleware xác thực JWT Access Token từ Header Authorization: Bearer <token>
 */
export async function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Vui lòng đăng nhập để truy cập tài nguyên này'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    if (!decoded || !decoded.userId) {
      return next(AppError.unauthorized('Mã xác thực không hợp lệ'));
    }

    const user = await authRepository.findById(decoded.userId);
    if (!user) {
      return next(AppError.unauthorized('Tài khoản người dùng không tồn tại'));
    }

    if (user.status === 'LOCKED') {
      return next(AppError.forbidden('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.'));
    }

    req.user = authService.formatAuthUser(user);
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(AppError.unauthorized('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.'));
    }
    return next(AppError.unauthorized('Mã xác thực không hợp lệ hoặc đã bị chỉnh sửa'));
  }
}

/**
 * Middleware tùy chọn xác thực JWT:
 * Nếu có Header Authorization hợp lệ thì gán req.user, nếu không có hoặc token hết hạn thì bỏ qua không chặn request.
 */
export async function optionalAuthenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
    if (decoded && decoded.userId) {
      const user = await authRepository.findById(decoded.userId);
      if (user && user.status !== 'LOCKED') {
        req.user = authService.formatAuthUser(user);
      }
    }
  } catch (_error) {
    // Không chặn request đối với middleware tùy chọn
  }
  next();
}

/**
 * Middleware kiểm tra vai trò người dùng (ví dụ: chỉ ADMIN)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Chưa xác thực quyền truy cập'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden('Bạn không có quyền truy cập chức năng này'));
    }

    next();
  };
}

/**
 * Middleware kiểm tra quyền hạn (Permissions)
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Chưa xác thực quyền truy cập'));
    }

    // Admin có toàn quyền hệ thống
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const hasPermission = permissions.every((p) => req.user?.permissions.includes(p));
    if (!hasPermission) {
      return next(AppError.forbidden('Bạn không có quyền thực hiện thao tác này'));
    }

    next();
  };
}

