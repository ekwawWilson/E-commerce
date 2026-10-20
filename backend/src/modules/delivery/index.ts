import { Router } from 'express';
import * as courierController from './courier.controller';
import { validate } from '../../middleware/validate';
import {
  createCourierSchema,
  updateCourierSchema,
  courierListQuerySchema,
  idParamsSchema,
} from '../../validations';

const router = Router();

// All routes are admin-only (authentication handled at route level)
router.get('/', validate(courierListQuerySchema, 'query'), courierController.getCouriers);
router.get('/:id', validate(idParamsSchema, 'params'), courierController.getCourier);
router.post('/', validate(createCourierSchema, 'body'), courierController.createCourier);
router.put(
  '/:id',
  validate(idParamsSchema, 'params'),
  validate(updateCourierSchema, 'body'),
  courierController.updateCourier
);

export const courierRoutes = router;

export { courierService } from './courier.service';
