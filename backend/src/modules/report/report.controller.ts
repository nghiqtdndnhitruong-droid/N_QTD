import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';

export class ReportController {
  /**
   * GET /api/v1/reports/disbursed-loans
   * Xem trước danh sách khoản vay đã giải ngân theo khoảng ngày
   */
  public async getDisbursedLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
      const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;

      const result = await reportService.getDisbursedLoans({ fromDate, toDate }, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/disbursed-loans/export
   * Tải về file Excel 2 sheet: Tín chấp và Thế chấp
   */
  public async exportDisbursedLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const fromDate = typeof req.query.fromDate === 'string' ? req.query.fromDate : undefined;
      const toDate = typeof req.query.toDate === 'string' ? req.query.toDate : undefined;

      const { buffer, filename } = await reportService.exportDisbursedLoansExcel({ fromDate, toDate }, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/maturity-loans
   * Xem trước danh sách khoản vay tới hạn theo Tháng và Năm
   */
  public async getMaturityLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const month = req.query.month ? String(req.query.month) : undefined;
      const year = req.query.year ? String(req.query.year) : undefined;

      const result = await reportService.getMaturityLoans({ month, year }, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/maturity-loans/export
   * Tải về file Excel danh sách tới hạn cho Tháng và Năm đã chọn
   */
  public async exportMaturityLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const month = req.query.month ? String(req.query.month) : undefined;
      const year = req.query.year ? String(req.query.year) : undefined;

      const { buffer, filename } = await reportService.exportMaturityLoansExcel({ month, year }, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/unpaid-interest
   * Xem trước danh sách các khoản vay chậm đóng lãi (3 tháng, 4 tháng...)
   */
  public async getUnpaidInterestLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = req.query.months ? String(req.query.months) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const result = await reportService.getUnpaidInterestLoans({ months, search }, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/reports/unpaid-interest/export
   * Tải về file Excel danh sách các khoản vay chậm đóng lãi
   */
  public async exportUnpaidInterestLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const months = req.query.months ? String(req.query.months) : undefined;
      const search = req.query.search ? String(req.query.search) : undefined;

      const { buffer, filename } = await reportService.exportUnpaidInterestExcel({ months, search }, req.user);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

export const reportController = new ReportController();

