import { Router } from 'express';
import { areaController } from './area.controller';
import { validate } from '../../shared/middlewares/validate.middleware';
import { asyncHandler } from '../../shared/middlewares/async-handler.middleware';
import {
  areaSearchQuerySchema,
  createAreaGroupSchema,
  createCommuneSchema,
  createHamletSchema,
  updateAreaGroupSchema,
  updateHamletSchema,
} from './area.validator';

const router = Router();

router.get('/tree', asyncHandler(areaController.getTree));
router.get('/groups', asyncHandler(areaController.getAreaGroups));
router.post(
  '/groups',
  validate({ body: createAreaGroupSchema }),
  asyncHandler(areaController.createAreaGroup)
);
router.put(
  '/groups/:id',
  validate({ body: updateAreaGroupSchema }),
  asyncHandler(areaController.updateAreaGroup)
);
router.delete('/groups/:id', asyncHandler(areaController.deleteAreaGroup));

router.get('/provinces', asyncHandler(areaController.getProvinces));
router.get('/provinces/:provinceId/communes', asyncHandler(areaController.getCommunesByProvince));
router.get('/communes/:communeId/hamlets', asyncHandler(areaController.getHamletsByCommune));
router.get(
  '/hamlets',
  validate({ query: areaSearchQuerySchema }),
  asyncHandler(areaController.searchHamlets)
);

router.post(
  '/communes',
  validate({ body: createCommuneSchema }),
  asyncHandler(areaController.createCommune)
);

router.post(
  '/hamlets',
  validate({ body: createHamletSchema }),
  asyncHandler(areaController.createHamlet)
);

router.put(
  '/hamlets/:id',
  validate({ body: updateHamletSchema }),
  asyncHandler(areaController.updateHamlet)
);

router.delete('/hamlets/:id', asyncHandler(areaController.deleteHamlet));

export const areaRoutes = router;

