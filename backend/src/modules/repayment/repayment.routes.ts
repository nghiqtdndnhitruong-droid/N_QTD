import { Router } from 'express';
import { repaymentController } from './repayment.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createRepaymentSchema,
  updateRepaymentSchema,
  deleteRepaymentSchema,
  estimateInterestQuerySchema,
} from './repayment.validator';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate({ body: createRepaymentSchema }),
  asyncHandler(repaymentController.create)
);

router.get(
  '/estimate-interest',
  validate({ query: estimateInterestQuerySchema }),
  asyncHandler(repaymentController.estimateInterest)
);

router.get(
  '/next-interest-period',
  asyncHandler(repaymentController.getNextInterestPeriod)
);

router.get(
  '/',
  asyncHandler(repaymentController.getByLoanId)
);

router.get(
  '/:id',
  asyncHandler(repaymentController.getById)
);

router.put(
  '/:id',
  validate({ body: updateRepaymentSchema }),
  asyncHandler(repaymentController.update)
);

router.delete(
  '/:id',
  validate({ body: deleteRepaymentSchema }),
  asyncHandler(repaymentController.delete)
);

export const repaymentRoutes = router;

