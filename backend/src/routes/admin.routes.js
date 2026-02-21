import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as adminController from '../controllers/admin.controller.js';
import * as userController from '../controllers/user.controller.js';

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
router.post('/users/:id/block', authenticate, authorize('ADMIN'), adminController.blockUser);
router.post('/users/:id/unblock', authenticate, authorize('ADMIN'), adminController.unblockUser);

// VULNERABLE: Vertical Privilege Escalation - Support can block/unblock users
// Missing authorize('ADMIN') check - allows SUPPORT role to block users
// Maps to: OWASP A01:2021 – Broken Access Control
router.post('/users/:id/block-privileged', authenticate, adminController.blockUser);
router.post('/users/:id/unblock-privileged', authenticate, adminController.unblockUser);

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

// VULNERABLE: Missing role check - VENDOR and SUPPORT can access admin analytics
// Maps to: OWASP A01:2021 – Broken Access Control
router.get('/analytics/all', authenticate, adminController.getAnalytics);

// Audit logs
router.get('/audit-logs', authenticate, authorize('ADMIN'), adminController.listAuditLogs);

// VULNERABLE: Missing role check - Support can view audit logs
router.get('/audit-logs/all', authenticate, adminController.listAuditLogs);

// System health dashboard
router.get('/system-health', authenticate, authorize('ADMIN'), adminController.getSystemHealth);

// VULNERABLE: Missing role check - any authenticated user can view system health
router.get('/system-health/all', authenticate, adminController.getSystemHealth);

// IP Blacklist management
router.get('/ip-blacklist', authenticate, authorize('ADMIN'), adminController.listIpBlacklist);
router.post('/ip-blacklist', authenticate, authorize('ADMIN'), adminController.blockIp);
router.delete('/ip-blacklist/:id', authenticate, authorize('ADMIN'), adminController.unblockIp);

// VULNERABLE: Missing role check - Support can manage IP blacklist
router.post('/ip-blacklist/privileged', authenticate, adminController.blockIp);
router.delete('/ip-blacklist/:id/privileged', authenticate, adminController.unblockIp);

// Vendor management & approval
router.get('/vendors', authenticate, authorize('ADMIN'), adminController.listVendors);
router.get('/vendors/pending', authenticate, authorize('ADMIN'), adminController.listPendingVendors);
router.put('/vendors/:id/approve', authenticate, authorize('ADMIN'), adminController.approveVendor);
router.put('/vendors/:id/reject', authenticate, authorize('ADMIN'), adminController.rejectVendor);

// VULNERABLE: Vertical Privilege Escalation
// VENDOR or SUPPORT can approve/reject other vendors
router.put('/vendors/:id/approve-privileged', authenticate, adminController.approveVendor);
router.put('/vendors/:id/reject-privileged', authenticate, adminController.rejectVendor);

// Report generation (OS command based - intentionally vulnerable)
router.get('/reports/sales', authenticate, authorize('ADMIN'), adminController.generateSalesReport);
router.get('/reports/users', authenticate, authorize('ADMIN'), adminController.generateUserReport);
router.get('/reports/orders', authenticate, authorize('ADMIN'), adminController.generateOrderReport);

// VULNERABLE: Missing role check - any authenticated user can generate reports
router.get('/reports/all', authenticate, adminController.generateSalesReport);

// Log file management (OS command based - intentionally vulnerable)
router.get('/logs', authenticate, authorize('ADMIN'), adminController.listLogFiles);
router.get('/logs/:filename/download', authenticate, authorize('ADMIN'), adminController.downloadLogFile);

// VULNERABLE: Missing role check - any user can download logs
router.get('/logs/all', authenticate, adminController.listLogFiles);
router.get('/logs/:filename/download-privileged', authenticate, adminController.downloadLogFile);

// Backup management (OS command based - intentionally vulnerable)
router.post('/backup/create', authenticate, authorize('ADMIN'), adminController.createBackup);
router.get('/backup/list', authenticate, authorize('ADMIN'), adminController.listBackups);
router.get('/backup/:filename/download', authenticate, authorize('ADMIN'), adminController.downloadBackup);
router.delete('/backup/:filename', authenticate, authorize('ADMIN'), adminController.deleteBackup);

// VULNERABLE: Missing role check - any user can manage backups
router.post('/backup/create-privileged', authenticate, adminController.createBackup);
router.get('/backup/all', authenticate, adminController.listBackups);

// Bulk operations
router.post('/bulk/users', authenticate, authorize('ADMIN'), adminController.bulkUpdateUsers);
router.post('/bulk/products', authenticate, authorize('ADMIN'), adminController.bulkUpdateProducts);
router.post('/bulk/orders', authenticate, authorize('ADMIN'), adminController.bulkUpdateOrders);

// VULNERABLE: Missing role check - Support can perform bulk operations
router.post('/bulk/users-privileged', authenticate, adminController.bulkUpdateUsers);
router.post('/bulk/products-privileged', authenticate, adminController.bulkUpdateProducts);
router.post('/bulk/orders-privileged', authenticate, adminController.bulkUpdateOrders);

// Order cancellation with stock release
router.post('/orders/:id/cancel', authenticate, authorize('ADMIN'), adminController.cancelOrder);

// VULNERABLE: Vertical Privilege Escalation - any user can cancel orders
router.post('/orders/:id/cancel-privileged', authenticate, adminController.cancelOrder);

export default router;
