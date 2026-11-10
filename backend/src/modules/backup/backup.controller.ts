import { Request, Response, NextFunction } from 'express';
import { backupService } from './backup.service';
import { AppError } from '../../shared/errors';

export class BackupController {
  /**
   * GET /api/v1/system/stats
   * Thống kê số lượng bản ghi của tất cả các bảng
   */
  public async getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await backupService.getDatabaseStats();
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/system/backup
   * Tải về toàn bộ cơ sở dữ liệu hệ thống dạng file JSON
   */
  public async exportBackup(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { buffer, filename, stats } = await backupService.exportDatabase();

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('X-Backup-Total-Records', Object.values(stats).reduce((a, b) => a + b, 0).toString());
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/system/restore
   * Nạp lại dữ liệu hệ thống từ file JSON sao lưu
   */
  public async importBackup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let contentStr = '';

      if (req.file) {
        contentStr = req.file.buffer.toString('utf-8');
      } else if (typeof req.body === 'string') {
        contentStr = req.body;
      } else if (req.body && typeof req.body === 'object') {
        contentStr = JSON.stringify(req.body);
      }

      if (!contentStr) {
        throw AppError.badRequest('Vui lòng chọn file sao lưu (.json) để tải lên dữ liệu');
      }

      const operatorUsername = req.user?.username || 'ADMIN';
      const result = await backupService.importDatabase(contentStr, operatorUsername);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/system/clean
   * Làm sạch toàn bộ cơ sở dữ liệu: xóa dữ liệu nghiệp vụ, chỉ giữ lại Admin, keyword và mẫu Word
   */
  public async cleanDatabase(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminUserId = req.user?.id || 'SYSTEM_ADMIN';
      const actorName = req.user?.fullName || req.user?.username || 'ADMIN';
      const result = await backupService.cleanDatabase(adminUserId, actorName);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const backupController = new BackupController();

