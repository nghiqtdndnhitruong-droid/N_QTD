import { Router } from 'express';
import { loanValuationController } from './loan-valuation.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createLoanValuationSchema,
  previewGroupValuationSchema,
  updateCommonValuationSchema,
  updateLoanValuationSchema,
} from './loan-valuation.validator';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate({ body: createLoanValuationSchema }),
  asyncHandler(loanValuationController.create)
);

router.post(
  '/preview',
  validate({ body: previewGroupValuationSchema }),
  asyncHandler(loanValuationController.preview)
);

router.get('/', asyncHandler(loanValuationController.findByLoanId));

router.put(
  '/common',
  validate({ body: updateCommonValuationSchema }),
  asyncHandler(loanValuationController.updateCommonSettings)
);

router.get('/:id', asyncHandler(loanValuationController.getById));

router.put(
  '/:id',
  validate({ body: updateLoanValuationSchema }),
  asyncHandler(loanValuationController.update)
);

router.delete('/:id', asyncHandler(loanValuationController.delete));

export const loanValuationRoutes = router;
