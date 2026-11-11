import { Router } from 'express';
import { loanController } from './loan.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import { optionalAuthenticateToken } from '../../shared/middlewares/auth.middleware';
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
import { loanValuationRoutes } from '../loan-valuation/loan-valuation.routes';

const router = Router();

// Tự động nhận diện cán bộ đang đăng nhập nếu có Bearer token
router.use(optionalAuthenticateToken);

// Sub-resources của khoản vay
router.use('/:loanId/collaterals', collateralRoutes);
router.use('/:loanId/valuations', loanValuationRoutes);
router.use('/:loanId/disbursements', disbursementRoutes);
router.use('/:loanId/repayments', repaymentRoutes);
router.use('/:loanId/related-persons', relatedPersonRoutes);

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

router.post('/:id/clone', asyncHandler(loanController.clone));

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
