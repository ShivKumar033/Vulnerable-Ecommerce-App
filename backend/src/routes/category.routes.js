const { Router } = require('express');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const categoryController = require('../controllers/category.controller');

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

module.exports = router;
