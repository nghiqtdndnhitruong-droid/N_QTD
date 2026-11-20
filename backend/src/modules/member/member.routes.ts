import { Router } from 'express';
import { memberController } from './member.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import { optionalAuthenticateToken } from '../../shared/middlewares/auth.middleware';
import {
  createMemberSchema,
  updateMemberSchema,
  memberFilterQuerySchema,
  deleteMemberBodySchema,
  saveCreditRatingSchema,
  batchCreditRatingSchema,
} from './member.validator';

const router = Router();

// Tự động nhận diện cán bộ đang đăng nhập nếu có Bearer token
router.use(optionalAuthenticateToken);

router.post(
  '/',
  validate({ body: createMemberSchema }),
  asyncHandler(memberController.create)
);

router.get(
  '/',
  validate({ query: memberFilterQuerySchema }),
  asyncHandler(memberController.findMany)
);

router.get(
  '/export',
  validate({ query: memberFilterQuerySchema }),
  asyncHandler(memberController.exportExcel)
);

router.put(
  '/batch/credit-rating',
  validate({ body: batchCreditRatingSchema }),
  asyncHandler(memberController.batchSaveCreditRating)
);

router.post(
  '/batch/credit-rating/export-zip',
  validate({ body: batchCreditRatingSchema }),
  asyncHandler(memberController.batchExportCreditRatingZip)
);

router.get('/:id', asyncHandler(memberController.getById));

router.put(
  '/:id',
  validate({ body: updateMemberSchema }),
  asyncHandler(memberController.update)
);

router.delete(
  '/:id',
  validate({ body: deleteMemberBodySchema }),
  asyncHandler(memberController.delete)
);

router.put(
  '/:id/credit-rating',
  validate({ body: saveCreditRatingSchema }),
  asyncHandler(memberController.saveCreditRating)
);

router.post(
  '/:id/credit-rating/export-docx',
  validate({ body: saveCreditRatingSchema.optional() }),
  asyncHandler(memberController.exportCreditRatingDocx)
);

router.delete(
  '/:id/credit-rating',
  asyncHandler(memberController.deleteCreditRating)
);

export const memberRoutes = router;
