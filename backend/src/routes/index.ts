import { Router } from 'express';

// Public routes
import { productRoutes } from '../modules/products';
import { cartRoutes } from '../modules/cart';
import { orderRoutes } from '../modules/orders';
import { categoryRoutes } from '../modules/categories';
import { supplierRoutes } from '../modules/suppliers';
import settingsRoutes from '../modules/settings/settings.routes';

// Payment routes
import { paymentRoutes } from '../modules/payments';

// Auth routes
import { authRoutes } from '../modules/auth';
import { supplierAuthRoutes } from '../modules/supplier-auth';
import { customerAuthRoutes } from '../modules/customer-auth';

// Supplier portal routes
import { supplierPortalRoutes } from '../modules/supplier-portal';

// Password reset (all account types) and coupons
import { passwordResetRoutes } from '../modules/account-tokens/password-reset.routes';
import { couponRoutes } from '../modules/coupons/coupon.routes';

// Admin routes
import adminRoutes from './admin';

const router = Router();

// Public API routes
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/settings', settingsRoutes);

// Payment routes
router.use('/payments', paymentRoutes);

// Auth routes
router.use('/auth', authRoutes);
router.use('/supplier-auth', supplierAuthRoutes);
router.use('/customers', customerAuthRoutes);
router.use('/password-reset', passwordResetRoutes);
router.use('/coupons', couponRoutes);

// Supplier portal routes
router.use('/supplier-portal', supplierPortalRoutes);

// Admin routes (all prefixed with /admin)
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
