import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Loyalty Points Controller
// Includes: Balance, History, Earn, Redeem, Expiry
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/loyalty/balance
 * Get user's loyalty points balance
 */
async function getBalance(req, res, next) {
    try {
        let loyalty = await prisma.loyaltyPoint.findUnique({
            where: { userId: req.user.id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        // Auto-create if doesn't exist
        if (!loyalty) {
            loyalty = await prisma.loyaltyPoint.create({
                data: { userId: req.user.id },
                include: { transactions: true },
            });
        }

        // Check if points are expired
        let isExpired = false;
        let expiredAmount = 0;
        if (loyalty.expiresAt && new Date(loyalty.expiresAt) < new Date()) {
            isExpired = true;
            expiredAmount = loyalty.balance;
        }

        return res.status(200).json({
            status: 'success',
            data: {
                balance: loyalty.balance,
                lifetimeEarnings: loyalty.lifetimeEarnings,
                expiresAt: loyalty.expiresAt,
                lastEarnedAt: loyalty.lastEarnedAt,
                isExpired,
                expiredAmount,
                transactions: loyalty.transactions,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/loyalty/history
 * Get user's loyalty points history
 */
async function getHistory(req, res, next) {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        let loyalty = await prisma.loyaltyPoint.findUnique({
            where: { userId: req.user.id },
        });

        if (!loyalty) {
            loyalty = await prisma.loyaltyPoint.create({
                data: { userId: req.user.id },
            });
        }

        const transactions = await prisma.loyaltyPointTransaction.findMany({
            where: { loyaltyPointId: loyalty.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        const total = await prisma.loyaltyPointTransaction.count({
            where: { loyaltyPointId: loyalty.id },
        });

        return res.status(200).json({
            status: 'success',
            data: {
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit)),
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/loyalty/earn
 * Earn loyalty points (called after order completion)
 */
async function earnPoints(req, res, next) {
    try {
        const { orderId, amount, description } = req.body;

        if (!orderId || !amount) {
            return res.status(400).json({
                status: 'error',
                message: 'orderId and amount are required.',
            });
        }

        // VULNERABLE: Race condition — no locking on balance update
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Race Conditions
        let loyalty = await prisma.loyaltyPoint.findUnique({
            where: { userId: req.user.id },
        });

        if (!loyalty) {
            loyalty = await prisma.loyaltyPoint.create({
                data: { userId: req.user.id },
            });
        }

        // Update balance without transaction locking
        const updated = await prisma.loyaltyPoint.update({
            where: { id: loyalty.id },
            data: {
                balance: { increment: amount },
                lifetimeEarnings: { increment: amount },
                lastEarnedAt: new Date(), // Update last earned timestamp
            },
        });

        // Record transaction
        await prisma.loyaltyPointTransaction.create({
            data: {
                loyaltyPointId: loyalty.id,
                type: 'EARN',
                amount,
                orderId,
                description: description || `Earned ${amount} points from order`,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'LOYALTY_POINTS_EARNED',
            entity: 'LoyaltyPoint',
            entityId: loyalty.id,
            metadata: { orderId, amount },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `Earned ${amount} loyalty points.`,
            data: { balance: updated.balance },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/loyalty/expire
 * Process expired points (for user or admin to manually trigger)
 */
async function expirePoints(req, res, next) {
    try {
        const userId = req.user.role === 'ADMIN' && req.body.userId 
            ? req.body.userId 
            : req.user.id;

        let loyalty = await prisma.loyaltyPoint.findUnique({
            where: { userId },
        });

        if (!loyalty) {
            return res.status(404).json({
                status: 'error',
                message: 'Loyalty points record not found.',
            });
        }

        // Check if points are expired based on expiresAt
        if (!loyalty.expiresAt || new Date(loyalty.expiresAt) > new Date()) {
            return res.status(400).json({
                status: 'error',
                message: 'Points have not expired yet.',
                data: { expiresAt: loyalty.expiresAt },
            });
        }

        const expiredAmount = loyalty.balance;

        // VULNERABLE: Race condition — no locking on balance update
        // Expire all points
        const updated = await prisma.loyaltyPoint.update({
            where: { id: loyalty.id },
            data: {
                balance: 0,
            },
        });

        // Record transaction
        await prisma.loyaltyPointTransaction.create({
            data: {
                loyaltyPointId: loyalty.id,
                type: 'EXPIRE',
                amount: -expiredAmount,
                description: `Expired ${expiredAmount} points`,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'LOYALTY_POINTS_EXPIRED',
            entity: 'LoyaltyPoint',
            entityId: loyalty.id,
            metadata: { expiredAmount, userId },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `${expiredAmount} loyalty points have expired.`,
            data: { expiredAmount, balance: updated.balance },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/loyalty/config
 * Configure loyalty points expiry (Admin only)
 */
async function configureExpiry(req, res, next) {
    try {
        const { userId, expiresInDays, expiresAt } = req.body;

        // Admin can configure for any user, regular users can only configure for themselves
        const targetUserId = req.user.role === 'ADMIN' && userId ? userId : req.user.id;

        let loyalty = await prisma.loyaltyPoint.findUnique({
            where: { userId: targetUserId },
        });

        if (!loyalty) {
            loyalty = await prisma.loyaltyPoint.create({
                data: { userId: targetUserId },
            });
        }

        let expiryDate;
        if (expiresAt) {
            expiryDate = new Date(expiresAt);
        } else if (expiresInDays) {
            expiryDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        } else {
            return res.status(400).json({
                status: 'error',
                message: 'Either expiresInDays or expiresAt is required.',
            });
        }

        const updated = await prisma.loyaltyPoint.update({
            where: { id: loyalty.id },
            data: {
                expiresAt: expiryDate,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'LOYALTY_EXPIRY_CONFIGURED',
            entity: 'LoyaltyPoint',
            entityId: loyalty.id,
            metadata: { targetUserId, expiresAt: expiryDate },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Loyalty points expiry configured.',
            data: { expiresAt: updated.expiresAt },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/loyalty/admin/process-expired
 * Admin endpoint to process all expired points (batch operation)
 */
async function processAllExpiredPoints(req, res, next) {
    try {
        // Find all loyalty points with expired balances
        const expiredPoints = await prisma.loyaltyPoint.findMany({
            where: {
                expiresAt: { lt: new Date() },
                balance: { gt: 0 },
            },
        });

        const results = [];
        for (const loyalty of expiredPoints) {
            const expiredAmount = loyalty.balance;

            // Expire the points
            await prisma.loyaltyPoint.update({
                where: { id: loyalty.id },
                data: { balance: 0 },
            });

            // Record transaction
            await prisma.loyaltyPointTransaction.create({
                data: {
                    loyaltyPointId: loyalty.id,
                    type: 'EXPIRE',
                    amount: -expiredAmount,
                    description: `Batch expired ${expiredAmount} points`,
                },
            });

            results.push({ userId: loyalty.userId, expiredAmount });
        }

        await createAuditLog({
            userId: req.user.id,
            action: 'LOYALTY_BATCH_EXPIRY_PROCESSED',
            entity: 'LoyaltyPoint',
            metadata: { processedCount: results.length, results },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `Processed ${results.length} expired loyalty point records.`,
            data: { processedCount: results.length, results },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/loyalty/redeem
 * Redeem loyalty points at checkout
 */
async function redeemPoints(req, res, next) {
    try {
        const { amount, orderId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid amount is required.',
            });
        }

        let loyalty = await prisma.loyaltyPoint.findUnique({
            where: { userId: req.user.id },
        });

        if (!loyalty || loyalty.balance < amount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient loyalty points.',
            });
        }

        // VULNERABLE: Race condition — no locking on balance update
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Race Conditions
        const updated = await prisma.loyaltyPoint.update({
            where: { id: loyalty.id },
            data: {
                balance: { decrement: amount },
            },
        });

        // Record transaction
        await prisma.loyaltyPointTransaction.create({
            data: {
                loyaltyPointId: loyalty.id,
                type: 'REDEEM',
                amount: -amount,
                orderId,
                description: `Redeemed ${amount} points`,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'LOYALTY_POINTS_REDEEMED',
            entity: 'LoyaltyPoint',
            entityId: loyalty.id,
            metadata: { amount, orderId },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `Redeemed ${amount} loyalty points.`,
            data: { balance: updated.balance },
        });
    } catch (error) {
        next(error);
    }
}

export {
    getBalance,
    getHistory,
    earnPoints,
    redeemPoints,
    expirePoints,
    configureExpiry,
    processAllExpiredPoints,
};

