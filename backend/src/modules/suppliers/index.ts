import { Router } from 'express';
import { supplierController } from './supplier.controller';

const router = Router();

// Public routes
router.get('/', supplierController.getSuppliers);
router.get('/:idOrSlug', supplierController.getSupplier);
router.get('/:idOrSlug/products', supplierController.getSupplierProducts);

export const supplierRoutes = router;

export { supplierController } from './supplier.controller';
export { supplierService } from './supplier.service';
