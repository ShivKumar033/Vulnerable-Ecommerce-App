import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as giftcardController from '../controllers/giftcard.controller.js';

const router = Router();

// Public route - check balance
router.get('/check', giftcardController.checkBalance);

// All other routes require authentication
router.use(authenticate);

// User routes
router.get('/', giftcardController.listGiftCards);
router.post('/purchase', giftcardController.purchaseGiftCard);
router.post('/redeem', giftcardController.redeemGiftCard);

export default router;

