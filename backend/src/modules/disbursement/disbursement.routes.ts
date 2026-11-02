import { Router } from 'express';
import { disbursementController } from './disbursement.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createDisbursementSchema,
  updateDisbursementSchema,
  deleteDisbursementSchema,
} from './disbursement.validator';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate({ body: createDisbursementSchema }),
  asyncHandler(disbursementController.create)
);

router.get(
  '/',
  asyncHandler(disbursementController.getByLoanId)
);

router.get(
  '/:id',
  asyncHandler(disbursementController.getById)
);

router.put(
  '/:id',
  validate({ body: updateDisbursementSchema }),
  asyncHandler(disbursementController.update)
);

router.delete(
  '/:id',
  validate({ body: deleteDisbursementSchema }),
  asyncHandler(disbursementController.delete)
);

export const disbursementRoutes = router;

