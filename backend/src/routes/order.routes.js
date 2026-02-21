import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as orderController from '../controllers/order.controller.js';
import * as userController from '../controllers/user.controller.js';

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

// VULNERABLE: Horizontal Privilege Escalation - Vendor can view ALL orders
// Not limited to own products - allows any vendor to see all orders
// Maps to: OWASP A01:2021 – Broken Access Control
router.get('/vendor/all', orderController.listAllOrders);

// Checkout
router.post('/checkout', orderController.checkout);

// User: list own orders
router.get('/', orderController.listOrders);

// User: get order details (by ID)
// VULNERABLE: IDOR - No ownership check, any user can view any order
router.get('/:id', orderController.getOrder);

// VULNERABLE: Order status update accessible to any authenticated user
// Should be restricted to ADMIN only, but intentionally weak.
// Maps to: OWASP A01:2021 – Broken Access Control
// PortSwigger – Business Logic Vulnerabilities
router.put('/:id/status', orderController.updateOrderStatus);

// VULNERABLE: Vertical Privilege Escalation
// Any user can cancel any order (not just their own)
// Maps to: OWASP A01:2021 – Broken Access Control
router.put('/:id/cancel', orderController.updateOrderStatus);

export default router;
