import { Router } from 'express';
import { asyncHandler, validate, authenticateToken, requirePermission } from '../../shared/middlewares';
import { userController } from './user.controller';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from './user.validator';

const router = Router();

router.get(
  '/',
  authenticateToken,
  requirePermission('user:view'),
  asyncHandler(userController.getUsers.bind(userController))
);

router.post(
  '/',
  authenticateToken,
  requirePermission('user:manage'),
  validate({ body: createUserSchema }),
  asyncHandler(userController.createUser.bind(userController))
);

router.get(
  '/:id',
  authenticateToken,
  asyncHandler(userController.getUserById.bind(userController))
);

router.put(
  '/:id',
  authenticateToken,
  validate({ body: updateUserSchema }),
  asyncHandler(userController.updateUser.bind(userController))
);

router.patch(
  '/:id/status',
  authenticateToken,
  requirePermission('user:manage'),
  asyncHandler(userController.updateStatus.bind(userController))
);

router.patch(
  '/:id/reset-password',
  authenticateToken,
  requirePermission('user:manage'),
  validate({ body: resetPasswordSchema }),
  asyncHandler(userController.resetPassword.bind(userController))
);

export const userRoutes = router;
