import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as supportController from '../controllers/support.controller.js';

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

// Users
router.get('/users', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUsers);
router.get('/users/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUser);
router.get('/users/:id/loyalty', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUserLoyalty);
router.get('/users/:id/wallet', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUserWallet);

// Coupons
router.get('/coupons/:id/usage', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewCouponUsage);

// Audit Logs
router.get('/audit-logs', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewAuditLogs);

// IP Blacklist (Read-only)
router.get('/ip-blacklist', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewIpBlacklist);

// Search
router.get('/search/users', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.searchUsers);
router.get('/search/orders', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.searchOrders);

export default router;
