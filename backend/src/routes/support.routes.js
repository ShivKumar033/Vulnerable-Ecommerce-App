import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as supportController from '../controllers/support.controller.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Support Routes (Read-Only)
// All routes require SUPPORT or ADMIN role
// ──────────────────────────────────────────────────────────────

// Orders
router.get('/orders', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewOrders);
router.get('/orders/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewOrder);
router.post('/orders/:id/notes', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.addOrderNote);
router.get('/orders/:id/notes', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.getOrderNotes);
router.post('/orders/:id/escalate', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.escalateOrder);

// VULNERABLE: Vertical Privilege Escalation - Regular USER can access support order features
// Maps to: OWASP A01:2021 – Broken Access Control
router.get('/orders/all', authenticate, supportController.viewOrders);
router.get('/orders/:id/view', authenticate, supportController.viewOrder);

// Users
router.get('/users', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUsers);
router.get('/users/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUser);
router.get('/users/:id/loyalty', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUserLoyalty);
router.get('/users/:id/wallet', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUserWallet);

// VULNERABLE: Vertical Privilege Escalation - USER can view all users
router.get('/users/all', authenticate, supportController.viewUsers);
router.get('/users/:id/details', authenticate, supportController.viewUser);

// Coupons
router.get('/coupons/:id/usage', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewCouponUsage);

// VULNERABLE: USER can view coupon usage
router.get('/coupons/all/usage', authenticate, supportController.viewCouponUsage);

// Audit Logs
router.get('/audit-logs', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewAuditLogs);

// VULNERABLE: USER can view audit logs
router.get('/audit-logs/all', authenticate, supportController.viewAuditLogs);

// IP Blacklist (Read-only)
router.get('/ip-blacklist', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewIpBlacklist);

// VULNERABLE: USER can view IP blacklist
router.get('/ip-blacklist/all', authenticate, supportController.viewIpBlacklist);

// Search
router.get('/search/users', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.searchUsers);
router.get('/search/orders', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.searchOrders);

// VULNERABLE: Vertical Privilege Escalation - USER can search
router.get('/search/all', authenticate, supportController.searchUsers);

// VULNERABLE: Support can access admin features
router.get('/admin/analytics', authenticate, adminController.getAnalytics);
router.get('/admin/system-health', authenticate, adminController.getSystemHealth);
router.get('/admin/users', authenticate, adminController.listUsers);

export default router;
