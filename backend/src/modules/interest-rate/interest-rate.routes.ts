import { Router } from 'express';
import { interestRateController } from './interest-rate.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createInterestRateConfigSchema,
  currentInterestRateQuerySchema,
  interestRateFilterQuerySchema,
  updateInterestRateConfigSchema,
} from './interest-rate.validator';

const router = Router();

/**
 * @swagger
 * /api/v1/interest-rates:
 *   post:
 *     summary: Tạo cấu hình bảng lãi suất mới
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - effectiveDate
 *               - tiers
 *             properties:
 *               loanType:
 *                 type: string
 *                 enum: [THE_CHAP, TIN_CHAP]
 *                 example: "THE_CHAP"
 *               termType:
 *                 type: string
 *                 enum: [NGAN_HAN, TRUNG_HAN]
 *                 example: "NGAN_HAN"
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               note:
 *                 type: string
 *                 example: "Bảng lãi suất điều chỉnh giữa năm 2026"
 *               tiers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - minAmount
 *                     - maxAmount
 *                     - annualRate
 *                   properties:
 *                     minAmount:
 *                       type: number
 *                       example: 0
 *                     maxAmount:
 *                       type: number
 *                       example: 99000000
 *                     annualRate:
 *                       type: number
 *                       description: Lãi suất năm (%)
 *                       example: 12.6
 *     responses:
 *       201:
 *         description: Tạo cấu hình thành công
 */
router.post(
  '/',
  validate({ body: createInterestRateConfigSchema }),
  asyncHandler(interestRateController.create)
);

/**
 * @swagger
 * /api/v1/interest-rates/current:
 *   get:
 *     summary: Lấy bảng lãi suất đang có hiệu lực theo thể loại vay và kỳ hạn
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     parameters:
 *       - in: query
 *         name: loanType
 *         schema:
 *           type: string
 *           enum: [THE_CHAP, TIN_CHAP]
 *           example: "THE_CHAP"
 *       - in: query
 *         name: termType
 *         schema:
 *           type: string
 *           enum: [NGAN_HAN, TRUNG_HAN]
 *           example: "NGAN_HAN"
 *         description: Kỳ hạn vay (bắt buộc đối với THE_CHAP)
 *     responses:
 *       200:
 *         description: Bảng lãi suất hiện hành
 *       404:
 *         description: Chưa có bảng lãi suất hiệu lực
 */
router.get(
  '/current',
  validate({ query: currentInterestRateQuerySchema }),
  asyncHandler(interestRateController.getCurrentEffective)
);

/**
 * @swagger
 * /api/v1/interest-rates:
 *   get:
 *     summary: Danh sách tất cả các bảng lãi suất (lịch sử)
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     parameters:
 *       - in: query
 *         name: loanType
 *         schema:
 *           type: string
 *           enum: [THE_CHAP, TIN_CHAP]
 *       - in: query
 *         name: termType
 *         schema:
 *           type: string
 *           enum: [NGAN_HAN, TRUNG_HAN]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Danh sách bảng lãi suất
 */
router.get(
  '/',
  validate({ query: interestRateFilterQuerySchema }),
  asyncHandler(interestRateController.findMany)
);

/**
 * @swagger
 * /api/v1/interest-rates/{id}:
 *   get:
 *     summary: Chi tiết một bảng lãi suất theo ID
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết bảng lãi suất
 */
router.get(
  '/:id',
  asyncHandler(interestRateController.getById)
);

/**
 * @swagger
 * /api/v1/interest-rates/{id}:
 *   put:
 *     summary: Chỉnh sửa cấu hình bảng lãi suất
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id',
  validate({ body: updateInterestRateConfigSchema }),
  asyncHandler(interestRateController.update)
);

/**
 * @swagger
 * /api/v1/interest-rates/{id}:
 *   delete:
 *     summary: Xóa một cấu hình bảng lãi suất
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
  '/:id',
  asyncHandler(interestRateController.delete)
);

export const interestRateRoutes = router;
