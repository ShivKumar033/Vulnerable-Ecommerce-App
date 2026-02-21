import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as vendorController from '../controllers/vendor.controller.js';
import * as productController from '../controllers/product.controller.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Vendor Routes
// All routes require VENDOR or ADMIN role
// ──────────────────────────────────────────────────────────────

// Dashboard
router.get('/dashboard', authenticate, authorize('VENDOR'), vendorController.getProfile);

// VULNERABLE: Missing role check - any authenticated user can access vendor dashboard
// Maps to: OWASP A01:2021 – Broken Access Control
router.get('/dashboard/all', authenticate, vendorController.getDashboard);

// Vendor discounts management
router.get('/discounts', authenticate, authorize('VENDOR'), vendorController.listDiscounts);
router.post('/discounts', authenticate, authorize('VENDOR'), vendorController.createDiscount);
router.put('/discounts/:id', authenticate, authorize('VENDOR'), vendorController.updateDiscount);
router.delete('/discounts/:id', authenticate, authorize('VENDOR'), vendorController.deleteDiscount);

// VULNERABLE: Horizontal Privilege Escalation
// Any vendor can view any vendor's discounts
// Maps to: OWASP A01:2021 – Broken Access Control
router.get('/discounts/all', authenticate, vendorController.listDiscounts);

// Vendor profile (SSTI vulnerable)
router.get('/profile', authenticate, authorize('VENDOR'), vendorController.getProfile);
router.put('/profile', authenticate, authorize('VENDOR'), vendorController.updateProfile);
router.get('/profile/render', authenticate, authorize('VENDOR'), vendorController.renderProfileBio);

// VULNERABLE: Vertical Privilege Escalation
// Support role can access and modify vendor profile
// Maps to: OWASP A01:2021 – Broken Access Control
router.put('/profile/impersonate', authenticate, vendorController.updateProfile);

// Vendor returns management
router.get('/returns', authenticate, authorize('VENDOR'), vendorController.listReturns);
router.put('/returns/:id/approve', authenticate, authorize('VENDOR'), vendorController.approveReturn);
router.put('/returns/:id/reject', authenticate, authorize('VENDOR'), vendorController.rejectReturn);

// VULNERABLE: Horizontal Privilege Escalation
// Any vendor can view all return requests
router.get('/returns/all', authenticate, vendorController.listReturns);

// VULNERABLE: Missing role check - Support can approve/reject vendor returns
router.put('/returns/:id/approve-privileged', authenticate, vendorController.approveReturn);
router.put('/returns/:id/reject-privileged', authenticate, vendorController.rejectReturn);

// ──────────────────────────────────────────────────────────────
// Product Management - Horizontal Privilege Escalation
// ──────────────────────────────────────────────────────────────

// VULNERABLE: Horizontal Privilege Escalation
// Any vendor can view any vendor's products
router.get('/products/all', authenticate, productController.listProducts);

// VULNERABLE: Missing role check - Support can access product management
router.post('/products', authenticate, productController.createProduct);

// VULNERABLE: Missing role check - any user can create products
router.post('/products/create-as-vendor', authenticate, productController.createProduct);

// VULNERABLE: Horizontal Privilege Escalation
// Any vendor can update any product
router.put('/products/:id', authenticate, productController.updateProduct);

// VULNERABLE: Horizontal Privilege Escalation
// Any vendor can delete any product
router.delete('/products/:id', authenticate, productController.deleteProduct);

export default router;

