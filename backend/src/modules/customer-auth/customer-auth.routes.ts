import { Router } from 'express';
import { authenticateCustomer } from '../../middleware/auth';
import * as controller from './customer-auth.controller';

const router = Router();

// Public routes
router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/google', controller.googleAuth);

// Protected routes (require customer authentication)
router.get('/me', authenticateCustomer, controller.getProfile);
router.put('/me', authenticateCustomer, controller.updateProfile);
router.put('/password', authenticateCustomer, controller.changePassword);

// Address management
router.get('/addresses', authenticateCustomer, controller.getAddresses);
router.post('/addresses', authenticateCustomer, controller.addAddress);
router.put('/addresses/:addressId', authenticateCustomer, controller.updateAddress);
router.delete('/addresses/:addressId', authenticateCustomer, controller.deleteAddress);

// Order history
router.get('/orders', authenticateCustomer, controller.getOrders);
router.get('/orders/:orderId', authenticateCustomer, controller.getOrder);

export default router;
