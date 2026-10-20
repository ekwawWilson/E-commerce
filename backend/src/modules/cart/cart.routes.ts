import { Router } from 'express';
import * as cartController from './cart.controller';
import { validate } from '../../middleware/validate';
import { apiLimiter } from '../../middleware/rateLimit';
import {
  cartIdParamsSchema,
  addCartItemSchema,
  updateCartItemSchema,
  cartItemParamsSchema,
} from '../../validations';

const router = Router();

/**
 * @route   POST /api/cart
 * @desc    Create a new cart
 * @access  Public
 */
router.post('/', apiLimiter, cartController.createCart);

/**
 * @route   GET /api/cart/:cartId
 * @desc    Get cart by cartId
 * @access  Public
 */
router.get(
  '/:cartId',
  apiLimiter,
  validate(cartIdParamsSchema, 'params'),
  cartController.getCart
);

/**
 * @route   POST /api/cart/:cartId/items
 * @desc    Add item to cart
 * @access  Public
 */
router.post(
  '/:cartId/items',
  apiLimiter,
  validate(cartIdParamsSchema, 'params'),
  validate(addCartItemSchema, 'body'),
  cartController.addCartItem
);

/**
 * @route   PUT /api/cart/:cartId/items/:itemId
 * @desc    Update cart item quantity
 * @access  Public
 */
router.put(
  '/:cartId/items/:itemId',
  apiLimiter,
  validate(cartItemParamsSchema, 'params'),
  validate(updateCartItemSchema, 'body'),
  cartController.updateCartItem
);

/**
 * @route   DELETE /api/cart/:cartId/items/:itemId
 * @desc    Remove item from cart
 * @access  Public
 */
router.delete(
  '/:cartId/items/:itemId',
  apiLimiter,
  validate(cartItemParamsSchema, 'params'),
  cartController.removeCartItem
);

/**
 * @route   DELETE /api/cart/:cartId/items
 * @desc    Clear all items from cart
 * @access  Public
 */
router.delete(
  '/:cartId/items',
  apiLimiter,
  validate(cartIdParamsSchema, 'params'),
  cartController.clearCart
);

/**
 * @route   DELETE /api/cart/:cartId
 * @desc    Delete cart entirely
 * @access  Public
 */
router.delete(
  '/:cartId',
  apiLimiter,
  validate(cartIdParamsSchema, 'params'),
  cartController.deleteCart
);

export default router;
