const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const authController = require('../controllers/auth.controller');

// ──────────────────────────────────────────────────────────────
// Auth Routes — /api/v1/auth
// ──────────────────────────────────────────────────────────────

// Public routes (no authentication required)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);

// VULNERABLE: No CSRF protection on any of these endpoints.
// Cross-origin requests can trigger login/register/password reset.
// Maps to: OWASP A05:2021 – Security Misconfiguration
// PortSwigger – Cross-Site Request Forgery (CSRF)

module.exports = router;
