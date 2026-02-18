const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const walletController = require('../controllers/wallet.controller');

const router = Router();

// ──────────────────────────────────────────────────────────────
// Wallet / Store Credits Routes
// ──────────────────────────────────────────────────────────────

// User endpoints (authenticated)
router.get('/', authenticate, walletController.getWallet);
router.get('/transactions', authenticate, walletController.listTransactions);

// VULNERABLE: No server-side credit source validation
// Maps to: OWASP A04:2021 – Insecure Design
router.post('/credit', authenticate, walletController.addCredit);

// VULNERABLE: Race condition — concurrent debits can overdraw balance
// Maps to: PortSwigger – Race Conditions
router.post('/debit', authenticate, walletController.debitWallet);

// VULNERABLE: Race condition + IDOR (any recipientId accepted)
// Maps to: PortSwigger – Race Conditions, Business Logic Vulnerabilities
router.post('/transfer', authenticate, walletController.transferCredits);

// Admin endpoints
router.get('/admin/:userId', authenticate, authorize('ADMIN'), walletController.adminGetWallet);
router.post('/admin/:userId/adjust', authenticate, authorize('ADMIN'), walletController.adminAdjustWallet);

module.exports = router;
