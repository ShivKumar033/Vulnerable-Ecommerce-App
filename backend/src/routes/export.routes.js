const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const exportController = require('../controllers/export.controller');

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

module.exports = router;
