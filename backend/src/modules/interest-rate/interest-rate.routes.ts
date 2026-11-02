import { Router } from 'express';
import { interestRateController } from './interest-rate.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createInterestRateConfigSchema,
  interestRateFilterQuerySchema,
} from './interest-rate.validator';
import { z } from 'zod';
import { LoanTermType } from '@prisma/client';

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
 *               - termType
 *               - tiers
 *             properties:
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               termType:
 *                 type: string
 *                 enum: [NGAN_HAN, TRUNG_HAN]
 *                 example: "NGAN_HAN"
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
 *     summary: Lấy bảng lãi suất đang có hiệu lực theo kỳ hạn
 *     tags: [2. Bảng Lãi Suất (Interest Rates)]
 *     parameters:
 *       - in: query
 *         name: termType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [NGAN_HAN, TRUNG_HAN]
 *           example: "NGAN_HAN"
 *         description: Kỳ hạn vay (NGAN_HAN = 12 tháng, TRUNG_HAN = 24 tháng)
 *     responses:
 *       200:
 *         description: Bảng lãi suất hiện hành
 *       404:
 *         description: Chưa có bảng lãi suất hiệu lực
 */
router.get(
  '/current',
  validate({
    query: z.object({
      termType: z.nativeEnum(LoanTermType, {
        errorMap: () => ({ message: 'Vui lòng cung cấp termType là NGAN_HAN hoặc TRUNG_HAN' }),
      }),
    }),
  }),
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

export const interestRateRoutes = router;
