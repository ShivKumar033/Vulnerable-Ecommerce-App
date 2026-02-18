const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const cartController = require('../controllers/cart.controller');

// ──────────────────────────────────────────────────────────────
// Cart Routes — /api/v1/cart
// All cart operations require authentication.
// ──────────────────────────────────────────────────────────────

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:itemId', cartController.updateCartItem);
router.delete('/:itemId', cartController.removeFromCart);

module.exports = router;
