import { Router } from 'express';
import { payoutController } from './payout.controller';

const router = Router();

// All routes are admin-only (authentication handled at route level)
router.get('/', payoutController.getPayouts);
router.get('/stats', payoutController.getPayoutStats);
router.get('/:payoutId', payoutController.getPayout);
router.post('/generate', payoutController.generatePayouts);
router.patch('/:payoutId/status', payoutController.updatePayoutStatus);
router.get('/supplier/:supplierId/earnings', payoutController.getSupplierEarnings);

export const payoutRoutes = router;

export { payoutController } from './payout.controller';
export { payoutService } from './payout.service';
