import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import * as paymentController from '../controllers/payment.controller.js';

// ──────────────────────────────────────────────────────────────
// Payment Routes — /api/v1/payments
// ──────────────────────────────────────────────────────────────

// All payment operations require authentication
router.use(authenticate);

// VULNERABLE: No rate limiting on payment endpoints
// Maps to: OWASP A04:2021 – Insecure Design

// ──────────────────────────────────────────────────────────────
// Mock Stripe-style Payment Flow
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/create-intent
 * Create a payment intent (mock)
 * Returns a payment intent ID that can be used to confirm payment
 */
router.post('/create-intent', paymentController.createPaymentIntent);

/**
 * POST /api/v1/payments/confirm
 * Confirm a payment using a payment intent
 */
router.post('/confirm', paymentController.confirmPayment);

// Process payment (legacy - combined create + charge)
router.post('/charge', paymentController.chargePayment);

// Get payment details for an order
router.get('/:orderId', paymentController.getPaymentDetails);

// Process refund
// VULNERABLE: No admin/role restriction — any authenticated user can issue refunds
// Maps to: OWASP A01:2021 – Broken Access Control
// PortSwigger – Business Logic Vulnerabilities
router.post('/refund', paymentController.refundPayment);

export default router;
