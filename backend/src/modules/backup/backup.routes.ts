import { Router } from 'express';
import multer from 'multer';
import { UserRole } from '@prisma/client';
import { asyncHandler, authenticateToken, requireRole } from '../../shared/middlewares';
import { backupController } from './backup.controller';

const router = Router();

// Cấu hình Multer upload tối đa 100MB cho file backup JSON
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

// Thống kê số lượng bản ghi các bảng (chỉ ADMIN)
router.get(
  '/stats',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  asyncHandler(backupController.getStats.bind(backupController))
);

// Xuất file sao lưu database (.json) (chỉ ADMIN)
router.get(
  '/backup',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  asyncHandler(backupController.exportBackup.bind(backupController))
);

// Nạp lại cơ sở dữ liệu từ file sao lưu (.json) (chỉ ADMIN)
router.post(
  '/restore',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  upload.single('file'),
  asyncHandler(backupController.importBackup.bind(backupController))
);

// Làm sạch toàn bộ cơ sở dữ liệu (chỉ ADMIN)
router.post(
  '/clean',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  asyncHandler(backupController.cleanDatabase.bind(backupController))
);

// Khôi phục từ khóa Word từ file keywords.sql mặc định của dự án (chỉ ADMIN)
router.post(
  '/keywords/restore-default',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  asyncHandler(backupController.restoreKeywordsDefault.bind(backupController))
);

// Nạp lại từ khóa Word từ file SQL người dùng tải lên (chỉ ADMIN)
router.post(
  '/keywords/upload-sql',
  authenticateToken,
  requireRole(UserRole.ADMIN),
  upload.single('file'),
  asyncHandler(backupController.uploadKeywordsSql.bind(backupController))
);

export const backupRoutes = router;

