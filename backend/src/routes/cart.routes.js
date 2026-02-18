import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import * as cartController from '../controllers/cart.controller.js';

// ──────────────────────────────────────────────────────────────
// Cart Routes — /api/v1/cart
// All cart operations require authentication.
// ──────────────────────────────────────────────────────────────

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:itemId', cartController.updateCartItem);
router.delete('/:itemId', cartController.removeFromCart);

export default router;
