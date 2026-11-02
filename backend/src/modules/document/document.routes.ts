import { Router } from 'express';
import { documentController } from './document.controller';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';

const router = Router({ mergeParams: true });

router.get('/templates', asyncHandler(documentController.getTemplates));
router.get('/generate', asyncHandler(documentController.generate));
router.get('/generate/:templateKey', asyncHandler(documentController.generate));
router.post('/export', asyncHandler(documentController.exportBatch));

export const documentRoutes = router;
