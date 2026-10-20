import { Router } from 'express';
import * as orderController from './order.controller';
import { validate } from '../../middleware/validate';
import {
  orderListQuerySchema,
  idParamsSchema,
  updateOrderStatusSchema,
  adminUpdateDeliveryStatusSchema,
  markShippedSchema,
} from '../../validations';

const router = Router();

// All routes are admin-only (authentication handled at route level)
router.get('/', validate(orderListQuerySchema, 'query'), orderController.getOrders);
router.get('/:id', validate(idParamsSchema, 'params'), orderController.getOrderAdmin);

router.patch(
  '/:id/payment-status',
  validate(idParamsSchema, 'params'),
  validate(updateOrderStatusSchema.pick({ paymentStatus: true }), 'body'),
  orderController.updateOrderStatus
);

router.patch(
  '/:id/delivery-status',
  validate(idParamsSchema, 'params'),
  validate(adminUpdateDeliveryStatusSchema, 'body'),
  orderController.updateDeliveryStatus
);

router.post(
  '/:id/ship',
  validate(idParamsSchema, 'params'),
  validate(markShippedSchema, 'body'),
  orderController.markAsShipped
);

router.post(
  '/:id/invoice',
  validate(idParamsSchema, 'params'),
  orderController.generateInvoice
);

export const adminOrderRoutes = router;
