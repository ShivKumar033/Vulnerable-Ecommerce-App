import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Admin Routes
// All routes require ADMIN role (via authorize middleware)
// ──────────────────────────────────────────────────────────────

// User management
router.get('/users', authenticate, authorize('ADMIN'), adminController.listUsers);
router.get('/users/:id', authenticate, authorize('ADMIN'), adminController.getUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), adminController.updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), adminController.deleteUser);

// Product moderation
router.get('/products', authenticate, authorize('ADMIN'), adminController.listAllProducts);
router.put('/products/:id/moderate', authenticate, authorize('ADMIN'), adminController.moderateProduct);

// Inventory control
router.get('/inventory', authenticate, authorize('ADMIN'), adminController.getInventory);
router.put('/inventory/:productId', authenticate, authorize('ADMIN'), adminController.updateStock);

// Coupon management
router.get('/coupons', authenticate, authorize('ADMIN'), adminController.listCoupons);
router.post('/coupons', authenticate, authorize('ADMIN'), adminController.createCoupon);
router.put('/coupons/:id', authenticate, authorize('ADMIN'), adminController.updateCoupon);
router.delete('/coupons/:id', authenticate, authorize('ADMIN'), adminController.deleteCoupon);

// Feature flags
router.get('/feature-flags', authenticate, authorize('ADMIN'), adminController.listFeatureFlags);
router.post('/feature-flags', authenticate, authorize('ADMIN'), adminController.createFeatureFlag);
router.put('/feature-flags/:id', authenticate, authorize('ADMIN'), adminController.updateFeatureFlag);
router.delete('/feature-flags/:id', authenticate, authorize('ADMIN'), adminController.deleteFeatureFlag);

// Analytics
router.get('/analytics', authenticate, authorize('ADMIN'), adminController.getAnalytics);

// Audit logs
router.get('/audit-logs', authenticate, authorize('ADMIN'), adminController.listAuditLogs);

// Bulk operations
router.post('/bulk/users', authenticate, authorize('ADMIN'), adminController.bulkUpdateUsers);
router.post('/bulk/products', authenticate, authorize('ADMIN'), adminController.bulkUpdateProducts);
router.post('/bulk/orders', authenticate, authorize('ADMIN'), adminController.bulkUpdateOrders);

// Order cancellation with stock release
router.post('/orders/:id/cancel', authenticate, authorize('ADMIN'), adminController.cancelOrder);

export default router;
