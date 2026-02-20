import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Gift Card Controller
// ──────────────────────────────────────────────────────────────

/**
 * Generate a random gift card code
 */
function generateGiftCardCode() {
    return `GIFT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * GET /api/v1/giftcards
 * List all gift cards (for user or admin)
 */
async function listGiftCards(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        
        // Users see their own, admins see all
        if (req.user.role === 'USER' || req.user.role === 'VENDOR') {
            where.OR = [
                { purchasedById: req.user.id },
                { redeemedById: req.user.id },
            ];
        }
        
        if (status) {
            where.status = status;
        }

        const giftCards = await prisma.giftCard.findMany({
            where,
            include: {
                purchasedBy: { select: { id: true, email: true } },
                redeemedBy: { select: { id: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        const total = await prisma.giftCard.count({ where });

        return res.status(200).json({
            status: 'success',
            data: {
                giftCards,
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
 * POST /api/v1/giftcards/purchase
 * Purchase a gift card
 */
async function purchaseGiftCard(req, res, next) {
    try {
        const { amount, currency = 'USD', expiresInDays = 365 } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid amount is required.',
            });
        }

        const code = generateGiftCardCode();
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

        const giftCard = await prisma.giftCard.create({
            data: {
                code,
                initialBalance: amount,
                currentBalance: amount,
                currency,
                status: 'ACTIVE',
                purchasedById: req.user.id,
                expiresAt,
            },
        });

        // Record transaction
        await prisma.giftCardTransaction.create({
            data: {
                giftCardId: giftCard.id,
                type: 'PURCHASE',
                amount,
                description: `Purchased gift card ${code}`,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'GIFT_CARD_PURCHASED',
            entity: 'GiftCard',
            entityId: giftCard.id,
            metadata: { code, amount },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Gift card purchased successfully.',
            data: {
                giftCard: {
                    id: giftCard.id,
                    code: giftCard.code,
                    initialBalance: giftCard.initialBalance,
                    currentBalance: giftCard.currentBalance,
                    expiresAt: giftCard.expiresAt,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/giftcards/redeem
 * Redeem a gift card
 */
async function redeemGiftCard(req, res, next) {
    try {
        const { code, amount } = req.body;

        if (!code || !amount) {
            return res.status(400).json({
                status: 'error',
                message: 'code and amount are required.',
            });
        }

        // VULNERABLE: Race condition — no locking on balance check and update
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Race Conditions (Gift Card Balance Race Condition)
        const giftCard = await prisma.giftCard.findUnique({
            where: { code: code.toUpperCase() },
        });

        if (!giftCard) {
            return res.status(404).json({
                status: 'error',
                message: 'Gift card not found.',
            });
        }

        if (giftCard.status !== 'ACTIVE') {
            return res.status(400).json({
                status: 'error',
                message: `Gift card is ${giftCard.status.toLowerCase()}.`,
            });
        }

        if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
            // Mark as expired
            await prisma.giftCard.update({
                where: { id: giftCard.id },
                data: { status: 'EXPIRED' },
            });
            return res.status(400).json({
                status: 'error',
                message: 'Gift card has expired.',
            });
        }

        if (giftCard.currentBalance < amount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient gift card balance.',
            });
        }

        // Update balance without transaction locking (race condition vulnerable)
        const updated = await prisma.giftCard.update({
            where: { id: giftCard.id },
            data: {
                currentBalance: { decrement: amount },
                redeemedById: req.user.id,
            },
        });

        // Check if fully redeemed
        if (updated.currentBalance <= 0) {
            await prisma.giftCard.update({
                where: { id: giftCard.id },
                data: { status: 'USED' },
            });
        }

        // Record transaction
        await prisma.giftCardTransaction.create({
            data: {
                giftCardId: giftCard.id,
                type: 'REDEEM',
                amount,
                description: `Redeemed ${amount} from gift card`,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'GIFT_CARD_REDEEMED',
            entity: 'GiftCard',
            entityId: giftCard.id,
            metadata: { code, amount },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `Redeemed ${amount} from gift card.`,
            data: {
                remainingBalance: updated.currentBalance,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/giftcards/check
 * Check gift card balance
 */
async function checkBalance(req, res, next) {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                status: 'error',
                message: 'code is required.',
            });
        }

        const giftCard = await prisma.giftCard.findUnique({
            where: { code: code.toUpperCase() },
            select: {
                id: true,
                code: true,
                currentBalance: true,
                status: true,
                expiresAt: true,
            },
        });

        if (!giftCard) {
            return res.status(404).json({
                status: 'error',
                message: 'Gift card not found.',
            });
        }

        return res.status(200).json({
            status: 'success',
            data: { giftCard },
        });
    } catch (error) {
        next(error);
    }
}

export {
    listGiftCards,
    purchaseGiftCard,
    redeemGiftCard,
    checkBalance,
};

