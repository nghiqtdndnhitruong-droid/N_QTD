import { Router } from 'express';
import { relatedPersonController } from './related-person.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createRelatedPersonSchema,
  deleteRelatedPersonBodySchema,
  updateRelatedPersonSchema,
} from './related-person.validator';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate({ body: createRelatedPersonSchema }),
  asyncHandler(relatedPersonController.create)
);

router.get('/', asyncHandler(relatedPersonController.findByLoanId));

router.get('/:id', asyncHandler(relatedPersonController.getById));

router.put(
  '/:id',
  validate({ body: updateRelatedPersonSchema }),
  asyncHandler(relatedPersonController.update)
);

router.delete(
  '/:id',
  validate({ body: deleteRelatedPersonBodySchema }),
  asyncHandler(relatedPersonController.delete)
);

export const relatedPersonRoutes = router;

