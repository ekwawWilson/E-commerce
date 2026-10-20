import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../../middleware/validate';
import { checkoutLimiter } from '../../middleware/rateLimit';
import { successResponse } from '../../utils/response';
import { createCouponSchema, updateCouponSchema, previewCouponSchema, idParamsSchema } from '../../validations';
import { couponService } from './coupon.service';

// ============================================
// PUBLIC
// ============================================

const publicRouter = Router();

/**
 * @route   POST /api/coupons/preview
 * @desc    Check a coupon against a cart and return the discount
 * @access  Public
 */
publicRouter.post(
  '/preview',
  checkoutLimiter,
  validate(previewCouponSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await couponService.previewForCart(req.body.code, req.body.cartId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }
);

export const couponRoutes = publicRouter;

// ============================================
// ADMIN (mounted under /api/admin/coupons)
// ============================================

const adminRouter = Router();

adminRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    return successResponse(res, await couponService.list());
  } catch (error) {
    next(error);
  }
});

adminRouter.post('/', validate(createCouponSchema, 'body'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    return successResponse(res, await couponService.create(req.body), 'Coupon created', 201);
  } catch (error) {
    next(error);
  }
});

adminRouter.put(
  '/:id',
  validate(idParamsSchema, 'params'),
  validate(updateCouponSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      return successResponse(res, await couponService.update(req.params.id, req.body), 'Coupon updated');
    } catch (error) {
      next(error);
    }
  }
);

adminRouter.delete('/:id', validate(idParamsSchema, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    return successResponse(res, await couponService.remove(req.params.id), 'Coupon removed');
  } catch (error) {
    next(error);
  }
});

export const adminCouponRoutes = adminRouter;
