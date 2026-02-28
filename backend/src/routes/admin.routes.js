import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Admin Routes
// All routes require ADMIN role
// ──────────────────────────────────────────────────────────────

// User management - Admin only
router.get('/users', authenticate, authorize('ADMIN'), adminController.listUsers);
router.get('/users/:id', authenticate, authorize('ADMIN'), adminController.getUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), adminController.updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), adminController.deleteUser);
router.post('/users/:id/block', authenticate, authorize('ADMIN'), adminController.blockUser);
router.post('/users/:id/unblock', authenticate, authorize('ADMIN'), adminController.unblockUser);

// Product moderation - Admin only
router.get('/products', authenticate, authorize('ADMIN'), adminController.listAllProducts);
router.put('/products/:id/moderate', authenticate, authorize('ADMIN'), adminController.moderateProduct);

// Inventory control - Admin only
router.get('/inventory', authenticate, authorize('ADMIN'), adminController.getInventory);
router.put('/inventory/:productId', authenticate, authorize('ADMIN'), adminController.updateStock);

// Coupon management - Admin only
router.get('/coupons', authenticate, authorize('ADMIN'), adminController.listCoupons);
router.post('/coupons', authenticate, authorize('ADMIN'), adminController.createCoupon);
router.put('/coupons/:id', authenticate, authorize('ADMIN'), adminController.updateCoupon);
router.delete('/coupons/:id', authenticate, authorize('ADMIN'), adminController.deleteCoupon);

// Feature flags - Admin only
router.get('/feature-flags', authenticate, authorize('ADMIN'), adminController.listFeatureFlags);
router.post('/feature-flags', authenticate, authorize('ADMIN'), adminController.createFeatureFlag);
router.put('/feature-flags/:id', authenticate, authorize('ADMIN'), adminController.updateFeatureFlag);
router.delete('/feature-flags/:id', authenticate, authorize('ADMIN'), adminController.deleteFeatureFlag);

// Analytics - Admin only
router.get('/analytics', authenticate, authorize('ADMIN'), adminController.getAnalytics);

// Audit logs - Admin only
router.get('/audit-logs', authenticate, authorize('ADMIN'), adminController.listAuditLogs);

// System health dashboard - Admin only
router.get('/system-health', authenticate, authorize('ADMIN'), adminController.getSystemHealth);

// IP Blacklist management - Admin only
router.get('/ip-blacklist', authenticate, authorize('ADMIN'), adminController.listIpBlacklist);
router.post('/ip-blacklist', authenticate, authorize('ADMIN'), adminController.blockIp);
router.delete('/ip-blacklist/:id', authenticate, authorize('ADMIN'), adminController.unblockIp);

// Vendor management & approval - Admin only
router.get('/vendors', authenticate, authorize('ADMIN'), adminController.listVendors);
router.get('/vendors/pending', authenticate, authorize('ADMIN'), adminController.listPendingVendors);
router.put('/vendors/:id/approve', authenticate, authorize('ADMIN'), adminController.approveVendor);
router.put('/vendors/:id/reject', authenticate, authorize('ADMIN'), adminController.rejectVendor);

// Report generation - Admin only
router.get('/reports/sales', authenticate, authorize('ADMIN'), adminController.generateSalesReport);
router.get('/reports/users', authenticate, authorize('ADMIN'), adminController.generateUserReport);
router.get('/reports/orders', authenticate, authorize('ADMIN'), adminController.generateOrderReport);

// Log file management - Admin only
router.get('/logs', authenticate, authorize('ADMIN'), adminController.listLogFiles);
router.get('/logs/:filename/download', authenticate, authorize('ADMIN'), adminController.downloadLogFile);

// Backup management - Admin only
router.post('/backup/create', authenticate, authorize('ADMIN'), adminController.createBackup);
router.get('/backup/list', authenticate, authorize('ADMIN'), adminController.listBackups);
router.get('/backup/:filename/download', authenticate, authorize('ADMIN'), adminController.downloadBackup);
router.delete('/backup/:filename', authenticate, authorize('ADMIN'), adminController.deleteBackup);

// Bulk operations - Admin only
router.post('/bulk/users', authenticate, authorize('ADMIN'), adminController.bulkUpdateUsers);
router.post('/bulk/products', authenticate, authorize('ADMIN'), adminController.bulkUpdateProducts);
router.post('/bulk/orders', authenticate, authorize('ADMIN'), adminController.bulkUpdateOrders);

// Order cancellation - Admin only
router.post('/orders/:id/cancel', authenticate, authorize('ADMIN'), adminController.cancelOrder);

export default router;
