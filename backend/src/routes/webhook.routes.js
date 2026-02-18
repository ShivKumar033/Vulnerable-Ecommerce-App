import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as webhookController from '../controllers/webhook.controller.js';

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

export default router;
