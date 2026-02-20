import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import * as cartController from '../controllers/cart.controller.js';

// ──────────────────────────────────────────────────────────────
// Cart Routes — /api/v1/cart
// Guest cart operations don't require authentication.
// ──────────────────────────────────────────────────────────────

// Public/guest routes (no authentication required for viewing and adding to cart)
router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:itemId', cartController.updateCartItem);
router.delete('/:itemId', cartController.removeFromCart);

// Protected routes (require authentication)
router.post('/merge', authenticate, cartController.mergeGuestCart);

export default router;
