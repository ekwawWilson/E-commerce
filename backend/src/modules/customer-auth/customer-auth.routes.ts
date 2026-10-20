import { Router } from 'express';
import { authenticateCustomer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authLimiter, registrationLimiter, passwordResetLimiter } from '../../middleware/rateLimit';
import {
  customerRegisterSchema,
  customerLoginSchema,
  googleAuthSchema,
  updateCustomerProfileSchema,
  customerChangePasswordSchema,
  customerAddressSchema,
  updateCustomerAddressSchema,
  cancelOrderSchema,
  wishlistItemSchema,
  confirmEmailSchema,
  confirmPhoneSchema,
} from '../../validations';
import * as controller from './customer-auth.controller';

const router = Router();

// Public routes
router.post('/register', registrationLimiter, validate(customerRegisterSchema, 'body'), controller.register);
router.post('/login', authLimiter, validate(customerLoginSchema, 'body'), controller.login);
router.post('/google', authLimiter, validate(googleAuthSchema, 'body'), controller.googleAuth);
router.post('/verify-email/confirm', passwordResetLimiter, validate(confirmEmailSchema, 'body'), controller.confirmEmail);

// Protected routes
router.get('/me', authenticateCustomer, controller.getProfile);
router.put('/me', authenticateCustomer, validate(updateCustomerProfileSchema, 'body'), controller.updateProfile);
router.put(
  '/password',
  authLimiter,
  authenticateCustomer,
  validate(customerChangePasswordSchema, 'body'),
  controller.changePassword
);

// Verification
router.post('/verify-email/request', passwordResetLimiter, authenticateCustomer, controller.requestEmailVerification);
router.post('/verify-phone/request', passwordResetLimiter, authenticateCustomer, controller.requestPhoneVerification);
router.post(
  '/verify-phone/confirm',
  authLimiter,
  authenticateCustomer,
  validate(confirmPhoneSchema, 'body'),
  controller.confirmPhone
);

// Address management
router.get('/addresses', authenticateCustomer, controller.getAddresses);
router.post('/addresses', authenticateCustomer, validate(customerAddressSchema, 'body'), controller.addAddress);
router.put(
  '/addresses/:addressId',
  authenticateCustomer,
  validate(updateCustomerAddressSchema, 'body'),
  controller.updateAddress
);
router.delete('/addresses/:addressId', authenticateCustomer, controller.deleteAddress);

// Order history
router.get('/orders', authenticateCustomer, controller.getOrders);
router.get('/orders/:orderId', authenticateCustomer, controller.getOrder);
router.post(
  '/orders/:orderId/cancel',
  authenticateCustomer,
  validate(cancelOrderSchema, 'body'),
  controller.cancelOrder
);

// Wishlist
router.get('/wishlist', authenticateCustomer, controller.getWishlist);
router.post('/wishlist', authenticateCustomer, validate(wishlistItemSchema, 'body'), controller.addToWishlist);
router.delete('/wishlist/:productId', authenticateCustomer, controller.removeFromWishlist);

export default router;
