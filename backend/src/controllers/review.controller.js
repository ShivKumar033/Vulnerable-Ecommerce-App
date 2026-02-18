import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Review Controller
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/reviews/product/:productId
 * List all reviews for a product.
 */
async function listProductReviews(req, res, next) {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * pageSize;

        const orderByObj = {};
        orderByObj[sortBy] = order;

        const [reviews, totalCount] = await Promise.all([
            prisma.review.findMany({
                where: { productId },
                skip,
                take: pageSize,
                orderBy: orderByObj,
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
                },
            }),
            prisma.review.count({ where: { productId } }),
        ]);

        // Compute average rating
        const aggResult = await prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
        });

        return res.status(200).json({
            status: 'success',
            data: {
                reviews,
                averageRating: aggResult._avg.rating ? Math.round(aggResult._avg.rating * 10) / 10 : 0,
                pagination: {
                    page: pageNum,
                    limit: pageSize,
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/reviews/product/:productId
 * Create a review for a product.
 */
async function createReview(req, res, next) {
    try {
        const { productId } = req.params;
        const { rating, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                status: 'error',
                message: 'Rating is required and must be between 1 and 5.',
            });
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found.' });
        }

        // Check for existing review
        const existing = await prisma.review.findUnique({
            where: { userId_productId: { userId: req.user.id, productId } },
        });

        if (existing) {
            return res.status(409).json({
                status: 'error',
                message: 'You have already reviewed this product. Use PUT to update.',
            });
        }

        // VULNERABLE: Stored XSS — comment is stored without sanitization
        // and will be returned as-is in API responses. When rendered by frontend
        // without escaping, JavaScript payloads will execute.
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – Stored XSS
        const review = await prisma.review.create({
            data: {
                userId: req.user.id,
                productId,
                rating: parseInt(rating, 10),
                comment: comment || null,
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'REVIEW_CREATED',
            entity: 'Review',
            entityId: review.id,
            metadata: { productId, rating, comment },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Review created.',
            data: { review },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/reviews/:id
 * Update a review.
 */
async function updateReview(req, res, next) {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        // VULNERABLE: IDOR — no ownership check. Any user can update any review.
        // Maps to: OWASP A01:2021 – Broken Access Control
        const existing = await prisma.review.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Review not found.' });
        }

        // VULNERABLE: Stored XSS in updated comment
        // Maps to: OWASP A03:2021 – Injection, PortSwigger – Stored XSS
        const review = await prisma.review.update({
            where: { id },
            data: {
                ...(rating !== undefined && { rating: parseInt(rating, 10) }),
                ...(comment !== undefined && { comment }),
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Review updated.',
            data: { review },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/reviews/:id
 * Delete a review.
 */
async function deleteReview(req, res, next) {
    try {
        const { id } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const existing = await prisma.review.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Review not found.' });
        }

        await prisma.review.delete({ where: { id } });

        await createAuditLog({
            userId: req.user.id,
            action: 'REVIEW_DELETED',
            entity: 'Review',
            entityId: id,
            req,
        });

        return res.status(200).json({ status: 'success', message: 'Review deleted.' });
    } catch (error) {
        next(error);
    }
}

export {
    listProductReviews,
    createReview,
    updateReview,
    deleteReview,
};
