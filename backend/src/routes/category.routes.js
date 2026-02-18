import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import authorize from '../middlewares/authorize.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Category Routes
// ──────────────────────────────────────────────────────────────

// Public: Browse categories
router.get('/', categoryController.listCategories);
router.get('/:id', categoryController.getCategory);

// Admin only: Manage categories
router.post('/', authenticate, authorize('ADMIN'), categoryController.createCategory);
router.put('/:id', authenticate, authorize('ADMIN'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.deleteCategory);

export default router;
