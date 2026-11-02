import { Router } from 'express';
import { loanController } from './loan.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createLoanSchema,
  updateLoanSchema,
  updateLoanStatusSchema,
  loanFilterQuerySchema,
  deleteLoanBodySchema,
} from './loan.validator';
import { collateralRoutes } from '../collateral/collateral.routes';
import { disbursementRoutes } from '../disbursement/disbursement.routes';
import { repaymentRoutes } from '../repayment/repayment.routes';
import { relatedPersonRoutes } from '../related-person/related-person.routes';
import { documentRoutes } from '../document/document.routes';

const router = Router();

// Sub-resources của khoản vay
router.use('/:loanId/collaterals', collateralRoutes);
router.use('/:loanId/disbursements', disbursementRoutes);
router.use('/:loanId/repayments', repaymentRoutes);
router.use('/:loanId/related-persons', relatedPersonRoutes);
router.use('/:loanId/documents', documentRoutes);

router.post(
  '/',
  validate({ body: createLoanSchema }),
  asyncHandler(loanController.create)
);

router.get(
  '/',
  validate({ query: loanFilterQuerySchema }),
  asyncHandler(loanController.findMany)
);

router.get('/plan-templates/calculate', asyncHandler(loanController.calculatePlanTemplate));

router.get('/:id', asyncHandler(loanController.getById));

router.get('/:id/summary', asyncHandler(loanController.getSummary));

router.put(
  '/:id',
  validate({ body: updateLoanSchema }),
  asyncHandler(loanController.update)
);

router.patch(
  '/:id/status',
  validate({ body: updateLoanStatusSchema }),
  asyncHandler(loanController.updateStatus)
);

router.delete(
  '/:id',
  validate({ body: deleteLoanBodySchema }),
  asyncHandler(loanController.delete)
);

export const loanRoutes = router;
