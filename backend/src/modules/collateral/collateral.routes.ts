import { Router } from 'express';
import { collateralController } from './collateral.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  collateralFilterQuerySchema,
  createCollateralSchema,
  updateCollateralSchema,
} from './collateral.validator';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate({ body: createCollateralSchema }),
  asyncHandler(collateralController.create)
);

router.get(
  '/',
  validate({ query: collateralFilterQuerySchema }),
  asyncHandler(collateralController.getByLoanIdOrList)
);

router.get('/:id', asyncHandler(collateralController.getById));

router.put(
  '/:id',
  validate({ body: updateCollateralSchema }),
  asyncHandler(collateralController.update)
);

router.delete('/:id', asyncHandler(collateralController.delete));

export const collateralRoutes = router;
