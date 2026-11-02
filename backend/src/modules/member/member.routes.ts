import { Router } from 'express';
import { memberController } from './member.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  createMemberSchema,
  updateMemberSchema,
  memberFilterQuerySchema,
  deleteMemberBodySchema,
} from './member.validator';

const router = Router();

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

export const memberRoutes = router;
