import { Router } from 'express';
import { asyncHandler, validate, authenticateToken } from '../../shared/middlewares';
import { authController } from './auth.controller';
import { loginSchema, changePasswordSchema, updateProfileSchema } from './auth.validator';

const router = Router();

// Public routes
router.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login.bind(authController)));
router.post('/logout', asyncHandler(authController.logout.bind(authController)));

// Protected routes (yêu cầu đăng nhập)
router.get('/me', authenticateToken, asyncHandler(authController.getMe.bind(authController)));
router.put(
  '/change-password',
  authenticateToken,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword.bind(authController))
);

// Profile routes
router.get('/profile', authenticateToken, asyncHandler(authController.getProfile.bind(authController)));
router.put(
  '/profile',
  authenticateToken,
  validate({ body: updateProfileSchema }),
  asyncHandler(authController.updateProfile.bind(authController))
);

export const authRoutes = router;
