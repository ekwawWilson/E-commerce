import { Router } from 'express';
import * as specificationController from './specification.controller';

const router = Router();

/**
 * @route   GET /api/admin/specifications
 * @desc    Get all specification templates
 * @access  Admin
 */
router.get('/', specificationController.getSpecificationTemplates);

/**
 * @route   GET /api/admin/specifications/groups
 * @desc    Get all unique groups
 * @access  Admin
 */
router.get('/groups', specificationController.getSpecificationGroups);

/**
 * @route   GET /api/admin/specifications/group/:group
 * @desc    Get templates by group
 * @access  Admin
 */
router.get('/group/:group', specificationController.getSpecificationsByGroup);

/**
 * @route   GET /api/admin/specifications/:id
 * @desc    Get specification template by ID
 * @access  Admin
 */
router.get('/:id', specificationController.getSpecificationTemplate);

/**
 * @route   POST /api/admin/specifications
 * @desc    Create a new specification template
 * @access  Admin
 */
router.post('/', specificationController.createSpecificationTemplate);

/**
 * @route   PUT /api/admin/specifications/:id
 * @desc    Update a specification template
 * @access  Admin
 */
router.put('/:id', specificationController.updateSpecificationTemplate);

/**
 * @route   DELETE /api/admin/specifications/:id
 * @desc    Delete a specification template
 * @access  Admin
 */
router.delete('/:id', specificationController.deleteSpecificationTemplate);

export default router;
