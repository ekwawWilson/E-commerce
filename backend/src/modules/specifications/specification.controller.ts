import { Response, NextFunction } from 'express';
import { specificationService } from './specification.service';
import { successResponse } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

/**
 * Get all specification templates
 */
export async function getSpecificationTemplates(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const templates = await specificationService.getAll();
    return successResponse(res, templates);
  } catch (error) {
    next(error);
  }
}

/**
 * Get specification template by ID
 */
export async function getSpecificationTemplate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const template = await specificationService.getById(req.params.id);
    return successResponse(res, template);
  } catch (error) {
    next(error);
  }
}

/**
 * Get specification templates by group
 */
export async function getSpecificationsByGroup(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const templates = await specificationService.getByGroup(req.params.group);
    return successResponse(res, templates);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all unique groups
 */
export async function getSpecificationGroups(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const groups = await specificationService.getGroups();
    return successResponse(res, groups);
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new specification template
 */
export async function createSpecificationTemplate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const template = await specificationService.create(req.body);
    return successResponse(res, template, 'Specification template created successfully', 201);
  } catch (error) {
    next(error);
  }
}

/**
 * Update a specification template
 */
export async function updateSpecificationTemplate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const template = await specificationService.update(req.params.id, req.body);
    return successResponse(res, template, 'Specification template updated successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a specification template
 */
export async function deleteSpecificationTemplate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    await specificationService.delete(req.params.id);
    return successResponse(res, null, 'Specification template deleted successfully');
  } catch (error) {
    next(error);
  }
}
