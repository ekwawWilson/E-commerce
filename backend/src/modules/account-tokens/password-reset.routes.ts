import { Router, Request, Response, NextFunction } from 'express';
import { AccountType } from '@prisma/client';
import { validate } from '../../middleware/validate';
import { passwordResetLimiter } from '../../middleware/rateLimit';
import { successResponse } from '../../utils/response';
import { passwordResetRequestSchema, passwordResetConfirmSchema } from '../../validations';
import { passwordResetService } from './password-reset.service';

const router = Router();

/**
 * @route   POST /api/password-reset/request
 * @desc    Email a reset link to a customer, supplier staff member or admin
 * @access  Public
 */
router.post(
  '/request',
  passwordResetLimiter,
  validate(passwordResetRequestSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await passwordResetService.requestReset(
        req.body.accountType as AccountType,
        req.body.email
      );
      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/password-reset/confirm
 * @desc    Set a new password using the emailed token
 * @access  Public
 */
router.post(
  '/confirm',
  passwordResetLimiter,
  validate(passwordResetConfirmSchema, 'body'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await passwordResetService.resetPassword(req.body.token, req.body.password);
      return successResponse(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
);

export const passwordResetRoutes = router;
