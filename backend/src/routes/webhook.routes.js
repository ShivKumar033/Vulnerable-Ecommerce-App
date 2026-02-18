const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const webhookController = require('../controllers/webhook.controller');

const router = Router();

// ──────────────────────────────────────────────────────────────
// Webhook Routes
// ──────────────────────────────────────────────────────────────

// VULNERABLE: No CSRF protection, no auth required for webhook endpoint
// Maps to: OWASP A01:2021 – Broken Access Control
// Maps to: PortSwigger – Business Logic Vulnerabilities
router.post('/payment', webhookController.paymentWebhook);

// Webhook config management (Admin only)
router.get('/configs', authenticate, authorize('ADMIN'), webhookController.listWebhookConfigs);
router.post('/configs', authenticate, authorize('ADMIN'), webhookController.createWebhookConfig);
router.put('/configs/:id', authenticate, authorize('ADMIN'), webhookController.updateWebhookConfig);
router.delete('/configs/:id', authenticate, authorize('ADMIN'), webhookController.deleteWebhookConfig);

module.exports = router;
