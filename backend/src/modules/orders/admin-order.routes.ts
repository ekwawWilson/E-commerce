import { Router } from 'express';
import * as orderController from './order.controller';
import { validate } from '../../middleware/validate';
import { requireRole } from '../../middleware/auth';
import {
  orderListQuerySchema,
  idParamsSchema,
  updateOrderStatusSchema,
  adminUpdateDeliveryStatusSchema,
  markShippedSchema,
  cancelOrderSchema,
  recordRefundSchema,
} from '../../validations';

// Money-affecting actions are limited to full admins; SUPPORT can view orders
// and progress deliveries.
const financeRoles = requireRole('ADMIN', 'SUPER_ADMIN');

const router = Router();

// All routes are admin-only (authentication handled at route level)
router.get('/', validate(orderListQuerySchema, 'query'), orderController.getOrders);
router.get('/:id', validate(idParamsSchema, 'params'), orderController.getOrderAdmin);

router.patch(
  '/:id/payment-status',
  financeRoles,
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
  '/:id/cancel',
  financeRoles,
  validate(idParamsSchema, 'params'),
  validate(cancelOrderSchema, 'body'),
  orderController.cancelOrder
);

router.post(
  '/:id/refund',
  financeRoles,
  validate(idParamsSchema, 'params'),
  validate(recordRefundSchema, 'body'),
  orderController.recordRefund
);

router.post(
  '/:id/invoice',
  validate(idParamsSchema, 'params'),
  orderController.generateInvoice
);

export const adminOrderRoutes = router;
