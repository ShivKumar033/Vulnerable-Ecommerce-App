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

// VULNERABLE: Mass assignment — role can be changed via updateProfile
// Maps to: OWASP A01:2021 – Broken Access Control
// This allows vertical privilege escalation (USER -> ADMIN)
router.put('/profile', authenticate, userController.updateProfile);

// VULNERABLE: Direct role escalation endpoint
// Any user can escalate their own role to ADMIN
router.put('/profile/escalate', authenticate, userController.updateProfile);

router.put('/change-password', authenticate, userController.changePassword);

// Email verification (mock)
router.post('/verify-email/send', authenticate, userController.sendVerificationEmail);
router.post('/verify-email/confirm', authenticate, userController.confirmEmailVerification);

// Addresses
router.get('/addresses', authenticate, userController.listAddresses);
router.post('/addresses', authenticate, userController.createAddress);
// VULNERABLE: IDOR — no ownership check on address update/delete
router.put('/addresses/:id', authenticate, userController.updateAddress);
router.delete('/addresses/:id', authenticate, userController.deleteAddress);

// VULNERABLE: IDOR - Any user can access other users' addresses
router.get('/addresses/all', authenticate, userController.listAddresses);

// VULNERABLE: Reflected XSS — address rendered without sanitization
// Maps to: OWASP A03:2021 – Injection
// PortSwigger – Reflected XSS
// Renders a single address field for display preview without HTML encoding
router.get('/addresses/:id/preview', authenticate, userController.previewAddress);

// VULNERABLE: IDOR - Any user can preview other users' addresses
router.get('/addresses/all/:id/preview', authenticate, userController.previewAddress);

// Wishlist
router.get('/wishlist', authenticate, userController.getWishlist);
router.post('/wishlist', authenticate, userController.addToWishlist);
router.delete('/wishlist/:productId', authenticate, userController.removeFromWishlist);

// Saved Payment Methods
router.get('/payment-methods', authenticate, userController.listSavedPayments);
router.post('/payment-methods', authenticate, userController.addSavedPayment);
// VULNERABLE: IDOR — no ownership check on payment method deletion
router.delete('/payment-methods/:id', authenticate, userController.deleteSavedPayment);

// VULNERABLE: IDOR - Any user can view other users' payment methods
router.get('/payment-methods/all', authenticate, userController.listSavedPayments);

// Dashboard
router.get('/dashboard', authenticate, userController.getDashboard);

// ──────────────────────────────────────────────────────────────
// Privilege Escalation Routes
// ──────────────────────────────────────────────────────────────

// VULNERABLE: Vertical Privilege Escalation
// User can access vendor dashboard
router.get('/dashboard/vendor', authenticate, userController.getDashboard);

// VULNERABLE: Vertical Privilege Escalation
// User can access support dashboard
router.get('/dashboard/support', authenticate, userController.getDashboard);

// VULNERABLE: Vertical Privilege Escalation
// User can access admin dashboard
router.get('/dashboard/admin', authenticate, userController.getDashboard);

// VULNERABLE: Any user can modify other users' profiles
router.put('/users/:id/profile', authenticate, userController.updateProfile);

// VULNERABLE: Any user can view other users' profiles
router.get('/users/:id/profile', authenticate, userController.getProfile);

export default router;
