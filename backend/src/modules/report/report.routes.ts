import { Router } from 'express';
import { asyncHandler, authenticateToken, requirePermission } from '../../shared/middlewares';
import { reportController } from './report.controller';

const router = Router();

// Xem trước danh sách khoản vay đã giải ngân theo khoảng ngày
router.get(
  '/disbursed-loans',
  authenticateToken,
  requirePermission('report:view'),
  asyncHandler(reportController.getDisbursedLoans.bind(reportController))
);

// Xuất file Excel 2 sheet (Tín chấp & Thế chấp) cho các khoản vay đã giải ngân
router.get(
  '/disbursed-loans/export',
  authenticateToken,
  requirePermission('report:export'),
  asyncHandler(reportController.exportDisbursedLoans.bind(reportController))
);

// Xem trước danh sách khoản vay tới hạn theo Tháng và Năm
router.get(
  '/maturity-loans',
  authenticateToken,
  requirePermission('report:view'),
  asyncHandler(reportController.getMaturityLoans.bind(reportController))
);

// Xuất file Excel danh sách tới hạn theo Tháng và Năm
router.get(
  '/maturity-loans/export',
  authenticateToken,
  requirePermission('report:export'),
  asyncHandler(reportController.exportMaturityLoans.bind(reportController))
);

// Xem trước danh sách khoản vay chậm đóng lãi (3 tháng, 4 tháng...)
router.get(
  '/unpaid-interest',
  authenticateToken,
  requirePermission('report:view'),
  asyncHandler(reportController.getUnpaidInterestLoans.bind(reportController))
);

// Xuất file Excel danh sách khoản vay chậm đóng lãi
router.get(
  '/unpaid-interest/export',
  authenticateToken,
  requirePermission('report:export'),
  asyncHandler(reportController.exportUnpaidInterestLoans.bind(reportController))
);

export const reportRoutes = router;

