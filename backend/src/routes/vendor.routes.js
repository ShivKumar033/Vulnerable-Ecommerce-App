import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as vendorController from '../controllers/vendor.controller.js';
import * as productController from '../controllers/product.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Vendor Routes
// All routes require VENDOR or ADMIN role
// ──────────────────────────────────────────────────────────────

// Dashboard
router.get('/dashboard', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.getDashboard);

// Vendor discounts management
router.get('/discounts', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.listDiscounts);
router.post('/discounts', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.createDiscount);
router.put('/discounts/:id', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.updateDiscount);
router.delete('/discounts/:id', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.deleteDiscount);

// Vendor profile (SSTI vulnerable)
router.get('/profile', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.getProfile);
router.put('/profile', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.updateProfile);
router.get('/profile/render', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.renderProfileBio);

// Vendor returns management
router.get('/returns', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.listReturns);
router.put('/returns/:id/approve', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.approveReturn);
router.put('/returns/:id/reject', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.rejectReturn);

// ──────────────────────────────────────────────────────────────
// Product Management - Vendor Only
// ──────────────────────────────────────────────────────────────

// Create product - Vendor or Admin only
router.post('/products', authenticate, authorize('VENDOR', 'ADMIN'), productController.createProduct);

// List vendor's products - automatically filter by authenticated vendor
router.get('/products', authenticate, authorize('VENDOR', 'ADMIN'), async (req, res, next) => {
    try {
        // Add vendorId filter to only show current vendor's products
        req.query.vendorId = req.user.id;
        await productController.listProducts(req, res, next);
    } catch (error) {
        next(error);
    }
});

// Update product - Vendor can only update their own products
router.put('/products/:id', authenticate, authorize('VENDOR', 'ADMIN'), productController.updateProduct);

// Delete product - Vendor can only delete their own products
router.delete('/products/:id', authenticate, authorize('VENDOR', 'ADMIN'), productController.deleteProduct);

// Upload product images
router.post('/products/:id/images', authenticate, authorize('VENDOR', 'ADMIN'), productController.uploadProductImages);

// Fetch image from URL
router.post('/products/:id/images/url', authenticate, authorize('VENDOR', 'ADMIN'), productController.fetchProductImageFromUrl);

// Vendor's orders
router.get('/orders', authenticate, authorize('VENDOR', 'ADMIN'), vendorController.listOrders);

export default router;

