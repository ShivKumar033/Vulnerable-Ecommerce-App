import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as supportController from '../controllers/support.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Support Routes (Read-Only)
// All routes require SUPPORT or ADMIN role
// ──────────────────────────────────────────────────────────────

router.get('/orders', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewOrders);
router.get('/orders/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewOrder);
router.get('/users', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUsers);
router.get('/users/:id', authenticate, authorize('SUPPORT', 'ADMIN'), supportController.viewUser);

export default router;
