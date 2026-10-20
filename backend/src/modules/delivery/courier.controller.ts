import { Response, NextFunction } from 'express';
import { courierService } from './courier.service';
import { successResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Get all couriers (admin)
 */
export async function getCouriers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { active } = req.query;
    const couriers = await courierService.getCouriers({
      active: active === undefined ? undefined : active === 'true',
    });
    return successResponse(res, couriers);
  } catch (error) {
    next(error);
  }
}

/**
 * Get single courier (admin)
 */
export async function getCourier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courier = await courierService.getCourier(req.params.id);
    return successResponse(res, courier);
  } catch (error) {
    next(error);
  }
}

/**
 * Create courier (admin)
 */
export async function createCourier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courier = await courierService.createCourier(req.body);
    return successResponse(res, courier, 'Courier created', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update courier (admin)
 */
export async function updateCourier(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courier = await courierService.updateCourier(req.params.id, req.body);
    return successResponse(res, courier, 'Courier updated');
  } catch (error) {
    next(error);
  }
}
