import { Router } from 'express';
import { assetPricingController } from './asset-pricing.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createAssetPricingRuleSchema,
  updateAssetPricingRuleSchema,
  assetPricingFilterQuerySchema,
} from './asset-pricing.validator';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/v1/asset-pricing-rules:
 *   post:
 *     summary: Tạo quy định đơn giá đất của Quỹ
 *     tags: [3. Bảng Giá Đất (Asset Pricing)]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - landCategory
 *               - pricePerSqMeter
 *               - effectiveDate
 *             properties:
 *               landCategory:
 *                 type: string
 *                 example: "Cập đường nhựa liên ấp"
 *               pricePerSqMeter:
 *                 type: number
 *                 description: Đơn giá VNĐ trên m²
 *                 example: 200000
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-01-01"
 *               note:
 *                 type: string
 *                 example: "Quy định giá đất mặt tiền đường nhựa"
 *     responses:
 *       201:
 *         description: Tạo quy định thành công
 */
router.post(
  '/',
  validate({ body: createAssetPricingRuleSchema }),
  asyncHandler(assetPricingController.create)
);

/**
 * @swagger
 * /api/v1/asset-pricing-rules/calculate:
 *   get:
 *     summary: Tính nhanh giá trị định giá tài sản theo diện tích và loại đất
 *     tags: [3. Bảng Giá Đất (Asset Pricing)]
 *     parameters:
 *       - in: query
 *         name: landCategory
 *         required: true
 *         schema:
 *           type: string
 *           example: "Đất ruộng"
 *         description: Loại đất (ví dụ Đất ruộng, Cập kênh, Cập đường lộ)
 *       - in: query
 *         name: area
 *         required: true
 *         schema:
 *           type: number
 *           example: 1000
 *         description: Diện tích (m²)
 *     responses:
 *       200:
 *         description: Kết quả định giá tài sản
 */
router.get(
  '/calculate',
  validate({
    query: z.object({
      landCategory: z.string().min(1, 'Vui lòng cung cấp landCategory'),
      area: z.coerce.number().positive('Diện tích phải lớn hơn 0'),
    }),
  }),
  asyncHandler(assetPricingController.calculateValuation)
);

/**
 * @swagger
 * /api/v1/asset-pricing-rules:
 *   get:
 *     summary: Danh sách các quy định đơn giá đất
 *     tags: [3. Bảng Giá Đất (Asset Pricing)]
 *     parameters:
 *       - in: query
 *         name: landCategory
 *         schema:
 *           type: string
 *         description: Lọc theo tên loại đất
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
 *         description: Danh sách bảng giá đất
 */
router.get(
  '/',
  validate({ query: assetPricingFilterQuerySchema }),
  asyncHandler(assetPricingController.findMany)
);

router.patch(
  '/reorder',
  asyncHandler(assetPricingController.reorder)
);

/**
 * @swagger
 * /api/v1/asset-pricing-rules/{id}:
 *   get:
 *     summary: Chi tiết một quy định giá đất
 *     tags: [3. Bảng Giá Đất (Asset Pricing)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết quy định
 */
router.get(
  '/:id',
  asyncHandler(assetPricingController.getById)
);

/**
 * @swagger
 * /api/v1/asset-pricing-rules/{id}:
 *   put:
 *     summary: Cập nhật đơn giá đất
 *     tags: [3. Bảng Giá Đất (Asset Pricing)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pricePerSqMeter:
 *                 type: number
 *                 example: 75000
 *               note:
 *                 type: string
 *                 example: "Điều chỉnh đơn giá đất cập kênh mới"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  '/:id',
  validate({ body: updateAssetPricingRuleSchema }),
  asyncHandler(assetPricingController.update)
);

/**
 * @swagger
 * /api/v1/asset-pricing-rules/{id}:
 *   delete:
 *     summary: Xóa một quy định đơn giá đất
 *     tags: [3. Bảng Giá Đất (Asset Pricing)]
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
  asyncHandler(assetPricingController.delete)
);

export const assetPricingRoutes = router;
