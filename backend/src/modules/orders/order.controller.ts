import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { successResponse, paginatedResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { CustomerRequest } from '../../middleware/auth';

/**
 * Create order from checkout (public; linked to the customer when signed in)
 */
export async function checkout(req: CustomerRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.checkout({ ...req.body, customerId: req.customer?.id });
    return successResponse(res, order, 'Order placed successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Price the cart for a delivery destination and optional coupon (public)
 */
export async function quote(req: Request, res: Response, next: NextFunction) {
  try {
    return successResponse(res, await orderService.quote(req.body));
  } catch (error) {
    next(error);
  }
}

/**
 * Track order (public; needs the order number plus its phone or email)
 */
export async function trackOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderNumber, phone, email } = req.query;
    const order = await orderService.trackOrder({
      orderNumber: orderNumber as string,
      phone: phone as string | undefined,
      email: email as string | undefined,
    });
    return successResponse(res, order);
  } catch (error) {
    next(error);
  }
}

/**
 * Get order by ID (public - no personal details)
 */
export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getPublicOrder(req.params.id);
    return successResponse(res, order);
  } catch (error) {
    next(error);
  }
}

// ============================================
// ADMIN CONTROLLERS
// ============================================

/**
 * Get paginated list of orders (admin)
 */
export async function getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { orders, total, page, limit } = await orderService.getOrders(req.query);
    return paginatedResponse(res, orders, page, limit, total);
  } catch (error) {
    next(error);
  }
}

/**
 * Get order by ID (admin - full info)
 */
export async function getOrderAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getOrderById(req.params.id);
    return successResponse(res, order);
  } catch (error) {
    next(error);
  }
}

/**
 * Update order status (admin)
 */
export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body);
    return successResponse(res, order, 'Order status updated');
  } catch (error) {
    next(error);
  }
}

/**
 * Update delivery status, optionally assigning a courier/tracking number (admin)
 */
export async function updateDeliveryStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { status, courierId, trackingNumber } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, {
      deliveryStatus: status,
      courierId,
      trackingNumber,
    });
    return successResponse(res, order, 'Delivery status updated');
  } catch (error) {
    next(error);
  }
}

/**
 * Mark order as shipped (admin)
 */
export async function markAsShipped(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.markAsShipped(req.params.id, req.body);
    return successResponse(res, order, 'Order marked as shipped');
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel order (admin)
 */
export async function cancelOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await orderService.cancelOrder(
      req.params.id,
      { type: 'admin', adminId: req.admin!.id },
      req.body.reason
    );
    return successResponse(res, result, 'Order cancelled');
  } catch (error) {
    next(error);
  }
}

/**
 * Record a refund for a cancelled, paid order (admin)
 */
export async function recordRefund(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const order = await orderService.recordRefund(req.params.id, req.body);
    return successResponse(res, order, 'Refund recorded');
  } catch (error) {
    next(error);
  }
}

/**
 * Generate invoice (admin)
 */
export async function generateInvoice(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const result = await orderService.generateInvoice(req.params.id);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}
