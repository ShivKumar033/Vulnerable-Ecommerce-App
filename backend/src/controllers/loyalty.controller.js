import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Loyalty Points Controller
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

        return res.status(200).json({
            status: 'success',
            data: {
                balance: loyalty.balance,
                lifetimeEarnings: loyalty.lifetimeEarnings,
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
};

