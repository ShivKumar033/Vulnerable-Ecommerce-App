import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import * as loyaltyController from '../controllers/loyalty.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Loyalty points routes
router.get('/balance', loyaltyController.getBalance);
router.get('/history', loyaltyController.getHistory);

// These would typically be called by internal services or webhooks
// but exposed here for demonstration
router.post('/earn', loyaltyController.earnPoints);
router.post('/redeem', loyaltyController.redeemPoints);

export default router;

