const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const supportController = require('../controllers/support.controller');

const router = Router();

// ──────────────────────────────────────────────────────────────
// Support Routes (Read-Only)
// All routes require SUPPORT or ADMIN role
// ──────────────────────────────────────────────────────────────

router.get('/orders', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewOrders);
router.get('/orders/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewOrder);
router.get('/users', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUsers);
router.get('/users/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUser);

module.exports = router;
