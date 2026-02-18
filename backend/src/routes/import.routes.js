const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const exportController = require('../controllers/export.controller');

const router = Router();

// ──────────────────────────────────────────────────────────────
// Import Routes
// ──────────────────────────────────────────────────────────────

// CSV Import (Admin/Vendor)
router.post('/products', authenticate, authorize('ADMIN', 'VENDOR'), exportController.importProductsCsv);

module.exports = router;
