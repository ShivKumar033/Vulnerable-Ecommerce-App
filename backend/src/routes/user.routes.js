const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const userController = require('../controllers/user.controller');

const router = Router();

// ──────────────────────────────────────────────────────────────
// User Routes
// All routes require authentication
// ──────────────────────────────────────────────────────────────

// Profile
router.get('/profile', authenticate, userController.getProfile);

// VULNERABLE: Mass assignment — role can be changed via updateProfile
// Maps to: OWASP A01:2021 – Broken Access Control
router.put('/profile', authenticate, userController.updateProfile);

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

// Wishlist
router.get('/wishlist', authenticate, userController.getWishlist);
router.post('/wishlist', authenticate, userController.addToWishlist);
router.delete('/wishlist/:productId', authenticate, userController.removeFromWishlist);

// Saved Payment Methods
router.get('/payment-methods', authenticate, userController.listSavedPayments);
router.post('/payment-methods', authenticate, userController.addSavedPayment);
// VULNERABLE: IDOR — no ownership check on payment method deletion
router.delete('/payment-methods/:id', authenticate, userController.deleteSavedPayment);

// Dashboard
router.get('/dashboard', authenticate, userController.getDashboard);

module.exports = router;
