import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as userController from '../controllers/user.controller.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// User Routes
// All routes require authentication
// ──────────────────────────────────────────────────────────────

// Profile
router.get('/profile', authenticate, userController.getProfile);

// VULNERABLE: SSTI - Render user profile bio with template injection
// Maps to: OWASP A03:2021 – Injection
// PortSwigger – Server-Side Template Injection
router.get('/profile/render', authenticate, userController.renderProfileBio);

// Update profile - role cannot be changed by regular users
router.put('/profile', authenticate, userController.updateProfile);

router.put('/change-password', authenticate, userController.changePassword);

// Email verification (mock)
router.post('/verify-email/send', authenticate, userController.sendVerificationEmail);
router.post('/verify-email/confirm', authenticate, userController.confirmEmailVerification);

// Addresses
router.get('/addresses', authenticate, userController.listAddresses);
router.post('/addresses', authenticate, userController.createAddress);
// IDOR protection added - ownership check in controller
router.put('/addresses/:id', authenticate, userController.updateAddress);
router.delete('/addresses/:id', authenticate, userController.deleteAddress);

// VULNERABLE: Reflected XSS — address rendered without sanitization
// Maps to: OWASP A03:2021 – Injection
// PortSwigger – Reflected XSS
// Renders a single address field for display preview without HTML encoding
router.get('/addresses/:id/preview', authenticate, userController.previewAddress);

// Wishlist
router.get('/wishlist', authenticate, userController.getWishlist);
router.post('/wishlist', authenticate, userController.addToWishlist);
router.delete('/wishlist/:productId', authenticate, userController.removeFromWishlist);

// Saved Payment Methods
router.get('/payment-methods', authenticate, userController.listSavedPayments);
router.post('/payment-methods', authenticate, userController.addSavedPayment);
// IDOR protection added - ownership check in controller
router.delete('/payment-methods/:id', authenticate, userController.deleteSavedPayment);

// Dashboard - returns role-specific data
router.get('/dashboard', authenticate, userController.getDashboard);

export default router;
