import { Request, Response, NextFunction } from 'express';
import { cartService } from './cart.service';
import { successResponse } from '../../utils/response';
import prisma from '../../config/database';

/**
 * Create a new cart
 */
export async function createCart(req: Request, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.createCart();
    return successResponse(res, cart, 'Cart created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Get cart by cartId
 */
export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { cartId } = req.params;
    const cart = await cartService.getCart(cartId);

    // Get delivery settings for calculating totals
    const deliverySettings = await prisma.setting.findUnique({
      where: { key: 'delivery_settings' },
    });

    const settings = deliverySettings?.value as {
      default_fee?: number;
      free_delivery_threshold?: number;
    } | null;

    const defaultFee = settings?.default_fee || 2000;
    const freeThreshold = settings?.free_delivery_threshold || 100000;

    const totals = cartService.calculateCartTotals(cart);
    const deliveryFee = totals.subtotal >= freeThreshold ? 0 : defaultFee;

    return successResponse(res, {
      ...cart,
      ...cartService.calculateCartTotals(cart, deliveryFee),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add item to cart
 */
export async function addCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { cartId } = req.params;
    const { productId, quantity, variantId } = req.body;

    const cart = await cartService.addItem(cartId, productId, quantity, variantId);
    const totals = cartService.calculateCartTotals(cart);

    return successResponse(
      res,
      { ...cart, ...totals },
      'Item added to cart'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { cartId, itemId } = req.params;
    const { quantity } = req.body;

    const cart = await cartService.updateItem(cartId, itemId, quantity);
    const totals = cartService.calculateCartTotals(cart);

    return successResponse(
      res,
      { ...cart, ...totals },
      'Cart item updated'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Remove item from cart
 */
export async function removeCartItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { cartId, itemId } = req.params;

    const cart = await cartService.removeItem(cartId, itemId);
    const totals = cartService.calculateCartTotals(cart);

    return successResponse(
      res,
      { ...cart, ...totals },
      'Item removed from cart'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Clear all items from cart
 */
export async function clearCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { cartId } = req.params;

    const cart = await cartService.clearCart(cartId);
    const totals = cartService.calculateCartTotals(cart);

    return successResponse(
      res,
      { ...cart, ...totals },
      'Cart cleared'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Delete cart entirely
 */
export async function deleteCart(req: Request, res: Response, next: NextFunction) {
  try {
    const { cartId } = req.params;
    await cartService.deleteCart(cartId);
    return successResponse(res, null, 'Cart deleted');
  } catch (error) {
    next(error);
  }
}
