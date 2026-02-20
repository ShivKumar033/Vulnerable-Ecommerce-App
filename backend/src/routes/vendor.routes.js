import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as vendorController from '../controllers/vendor.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Vendor Routes
// All routes require VENDOR or ADMIN role
// ──────────────────────────────────────────────────────────────

// Dashboard
router.get('/dashboard', authenticate, authorize('VENDOR'), vendorController.getProfile);

// Vendor discounts management
router.get('/discounts', authenticate, authorize('VENDOR'), vendorController.listDiscounts);
router.post('/discounts', authenticate, authorize('VENDOR'), vendorController.createDiscount);
router.put('/discounts/:id', authenticate, authorize('VENDOR'), vendorController.updateDiscount);
router.delete('/discounts/:id', authenticate, authorize('VENDOR'), vendorController.deleteDiscount);

// Vendor profile (SSTI vulnerable)
router.get('/profile', authenticate, authorize('VENDOR'), vendorController.getProfile);
router.put('/profile', authenticate, authorize('VENDOR'), vendorController.updateProfile);
router.get('/profile/render', authenticate, authorize('VENDOR'), vendorController.renderProfileBio);

// Vendor returns management
router.get('/returns', authenticate, authorize('VENDOR'), vendorController.listReturns);
router.put('/returns/:id/approve', authenticate, authorize('VENDOR'), vendorController.approveReturn);
router.put('/returns/:id/reject', authenticate, authorize('VENDOR'), vendorController.rejectReturn);

export default router;

