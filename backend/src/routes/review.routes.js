import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Review Routes
// ──────────────────────────────────────────────────────────────

// Public: View reviews for a product
router.get('/product/:productId', reviewController.listProductReviews);

// Authenticated: Create, update, delete reviews
router.post('/product/:productId', authenticate, reviewController.createReview);

// VULNERABLE: IDOR — no ownership check on update/delete
// Maps to: OWASP A01:2021 – Broken Access Control
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);

export default router;
