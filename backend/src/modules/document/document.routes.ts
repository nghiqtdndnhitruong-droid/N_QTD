import { Router } from 'express';
import { documentController } from './document.controller';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';

const router = Router({ mergeParams: true });

router.get('/templates', asyncHandler(documentController.getTemplates));
router.get('/generate', asyncHandler(documentController.generate));
router.get('/generate/:templateKey', asyncHandler(documentController.generate));

export const documentRoutes = router;

