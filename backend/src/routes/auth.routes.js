import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import * as authController from '../controllers/auth.controller.js';
import * as oauthController from '../controllers/oauth.controller.js';

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

// ──────────────────────────────────────────────────────────────
// OAuth Routes — Google
// ──────────────────────────────────────────────────────────────

// VULNERABLE: Missing state parameter — no CSRF protection in OAuth flow
// Maps to: PortSwigger – OAuth authentication vulnerabilities
router.get('/google', oauthController.googleLogin);
router.get('/google/callback', oauthController.googleCallback);

// OAuth account linking (authenticated)
// VULNERABLE: Account linking without re-authentication
// Maps to: PortSwigger – OAuth authentication vulnerabilities
router.post('/oauth/link', authenticate, oauthController.linkOAuthAccount);

// VULNERABLE: IDOR — no ownership check on unlink
router.delete('/oauth/unlink/:id', authenticate, oauthController.unlinkOAuthAccount);

// VULNERABLE: No CSRF protection on any of these endpoints.
// Cross-origin requests can trigger login/register/password reset.
// Maps to: OWASP A05:2021 – Security Misconfiguration
// PortSwigger – Cross-Site Request Forgery (CSRF)

export default router;
