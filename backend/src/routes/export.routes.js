import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as exportController from '../controllers/export.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Export / Import Routes
// ──────────────────────────────────────────────────────────────

// CSV Exports (Admin/Vendor)
router.get('/orders', authenticate, authorize('ADMIN', 'VENDOR'), exportController.exportOrdersCsv);
router.get('/users', authenticate, authorize('ADMIN'), exportController.exportUsersCsv);
router.get('/products', authenticate, authorize('ADMIN', 'VENDOR'), exportController.exportProductsCsv);
router.get('/audit-logs', authenticate, authorize('ADMIN'), exportController.exportAuditLogsCsv);

// Invoice generation
// VULNERABLE: IDOR — no ownership check, SSRF via templateUrl
router.get('/invoices/:orderId', authenticate, exportController.generateInvoice);

// PDF invoice generation
// VULNERABLE: IDOR — no ownership check
router.get('/invoices/:orderId/pdf', authenticate, exportController.generateInvoicePdf);

export default router;
