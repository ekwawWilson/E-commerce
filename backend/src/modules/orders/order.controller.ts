import { Request, Response, NextFunction } from 'express';
import { orderService } from './order.service';
import { successResponse, paginatedResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Create order from checkout (public)
 */
export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.checkout(req.body);
    return successResponse(res, order, 'Order placed successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Track order (public)
 */
export async function trackOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderNumber, phone, email } = req.query;
    const orders = await orderService.trackOrder({
      orderNumber: orderNumber as string,
      phone: phone as string,
      email: email as string,
    });
    return successResponse(res, orders);
  } catch (error) {
    next(error);
  }
}

/**
 * Get order by ID (public - limited info)
 */
export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getOrderById(req.params.id);

    // Return limited info for public access
    return successResponse(res, {
      orderNumber: order.orderNumber,
      status: order.paymentStatus,
      deliveryStatus: order.deliveryStatus,
      items: order.itemsSnapshot,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      currency: order.currency,
      createdAt: order.createdAt,
      delivery: order.delivery
        ? {
            status: order.delivery.status,
            trackingNumber: order.delivery.trackingNumber,
            estimatedDate: order.delivery.estimatedDate,
          }
        : null,
    });
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
