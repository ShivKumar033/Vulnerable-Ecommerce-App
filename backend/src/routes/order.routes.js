const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const orderController = require('../controllers/order.controller');

// ──────────────────────────────────────────────────────────────
// Order Routes — /api/v1/orders
// ──────────────────────────────────────────────────────────────

// All order operations require authentication
router.use(authenticate);

// ── Admin / Vendor routes MUST come BEFORE /:id to avoid param collision ──

// Admin: view all orders
router.get(
    '/admin/all',
    authorize('ADMIN'),
    orderController.listAllOrders
);

// Vendor: view orders containing their products
router.get(
    '/vendor/my-orders',
    authorize('VENDOR'),
    orderController.listVendorOrders
);

// Checkout
router.post('/checkout', orderController.checkout);

// User: list own orders
router.get('/', orderController.listOrders);

// User: get order details (by ID)
router.get('/:id', orderController.getOrder);

// VULNERABLE: Order status update accessible to any authenticated user
// Should be restricted to ADMIN only, but intentionally weak.
// Maps to: OWASP A01:2021 – Broken Access Control
// PortSwigger – Business Logic Vulnerabilities
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
