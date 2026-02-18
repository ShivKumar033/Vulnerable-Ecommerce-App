import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import * as paymentController from '../controllers/payment.controller.js';

// ──────────────────────────────────────────────────────────────
// Payment Routes — /api/v1/payments
// ──────────────────────────────────────────────────────────────

// All payment operations require authentication
router.use(authenticate);

// Process payment
router.post('/charge', paymentController.chargePayment);

// Get payment details for an order
router.get('/:orderId', paymentController.getPaymentDetails);

// Process refund
// VULNERABLE: No admin/role restriction — any authenticated user can issue refunds
// Maps to: OWASP A01:2021 – Broken Access Control
// PortSwigger – Business Logic Vulnerabilities
router.post('/refund', paymentController.refundPayment);

export default router;
