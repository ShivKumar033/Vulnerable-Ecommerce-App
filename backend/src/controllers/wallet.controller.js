import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Wallet / Store Credits Controller
// ──────────────────────────────────────────────────────────────
// This module deliberately omits transactional locking so that
// concurrent requests can create race conditions (double-spend).
// ──────────────────────────────────────────────────────────────

// ═══════════════════════════
// GET WALLET
// ═══════════════════════════

/**
 * GET /api/v1/wallet
 * Retrieve the authenticated user's wallet (auto-create if missing).
 */
async function getWallet(req, res, next) {
    try {
        let wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId: req.user.id },
                include: { transactions: true },
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                wallet: {
                    id: wallet.id,
                    balance: wallet.balance,
                    currency: wallet.currency,
                    transactions: wallet.transactions,
                    createdAt: wallet.createdAt,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// ADD CREDITS (top-up)
// ═══════════════════════════

/**
 * POST /api/v1/wallet/credit
 * Add store credits to the authenticated user's wallet.
 */
async function addCredit(req, res, next) {
    try {
        const { amount, description } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'amount must be a positive number.',
            });
        }

        const creditAmount = parseFloat(amount);

        let wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId: req.user.id },
            });
        }

        // VULNERABLE: No server-side validation of credit source (e.g. payment proof).
        // Any authenticated user can add arbitrary credits to their own wallet.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Business Logic Vulnerabilities
        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { increment: creditAmount },
            },
        });

        const transaction = await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: 'credit',
                amount: creditAmount,
                description: description || 'Manual credit top-up',
                metadata: { source: 'user_topup', ip: req.ip },
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'WALLET_CREDIT',
            entity: 'Wallet',
            entityId: wallet.id,
            metadata: { amount: creditAmount, newBalance: updatedWallet.balance },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `$${creditAmount} credited to wallet.`,
            data: {
                wallet: {
                    id: updatedWallet.id,
                    balance: updatedWallet.balance,
                },
                transaction,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// DEBIT / SPEND CREDITS
// ═══════════════════════════

/**
 * POST /api/v1/wallet/debit
 * Deduct store credits from the wallet.
 *
 * VULNERABLE: Race condition — the balance is read and then decremented in
 * two separate queries with NO transaction isolation / row-level locking.
 * If two requests arrive simultaneously, both can read the SAME balance and
 * both will succeed — resulting in a negative balance (double-spend).
 *
 * Maps to: OWASP A04:2021 – Insecure Design
 * PortSwigger – Race Conditions
 *
 * To exploit (with curl):
 *   for i in $(seq 1 5); do
 *     curl -X POST http://localhost:5000/api/v1/wallet/debit \
 *       -H "Authorization: Bearer <token>" \
 *       -H "Content-Type: application/json" \
 *       -d '{"amount": 50, "description": "race test"}' &
 *   done
 */
async function debitWallet(req, res, next) {
    try {
        const { amount, description, orderId } = req.body;

        if (!amount || parseFloat(amount) <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'amount must be a positive number.',
            });
        }

        const debitAmount = parseFloat(amount);

        // Step 1: READ the current balance
        // VULNERABLE: This read and the subsequent update are NOT atomic.
        // Another concurrent request can read the same balance before either
        // updates it, allowing both to succeed (TOCTOU race condition).
        // Maps to: PortSwigger – Race Conditions
        const wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
        });

        if (!wallet) {
            return res.status(404).json({
                status: 'error',
                message: 'Wallet not found. Add credits first.',
            });
        }

        const currentBalance = parseFloat(wallet.balance);

        // VULNERABLE: Intentional delay to widen the race window
        // In production code you'd never do this, but it makes the race
        // condition more reliably exploitable for training/testing.
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Step 2: CHECK balance
        if (currentBalance < debitAmount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient wallet balance.',
                data: { currentBalance, requested: debitAmount },
            });
        }

        // Step 3: UPDATE balance (separate from the read — TOCTOU gap)
        // VULNERABLE: No row-level lock, no optimistic concurrency, no transaction
        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: {
                balance: { decrement: debitAmount },
            },
        });

        const transaction = await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: 'debit',
                amount: debitAmount,
                description: description || 'Wallet debit',
                referenceId: orderId || null,
                metadata: { ip: req.ip },
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'WALLET_DEBIT',
            entity: 'Wallet',
            entityId: wallet.id,
            metadata: {
                amount: debitAmount,
                previousBalance: currentBalance,
                newBalance: updatedWallet.balance,
            },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `$${debitAmount} debited from wallet.`,
            data: {
                wallet: {
                    id: updatedWallet.id,
                    balance: updatedWallet.balance,
                },
                transaction,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// TRANSFER CREDITS
// ═══════════════════════════

/**
 * POST /api/v1/wallet/transfer
 * Transfer credits from authenticated user's wallet to another user.
 *
 * VULNERABLE: Same race condition as debit — sender's balance can be
 * double-spent. Also IDOR-adjacent: any userId can be used as recipientId.
 *
 * Maps to: OWASP A04:2021 – Insecure Design
 * PortSwigger – Race Conditions, Business Logic Vulnerabilities
 */
async function transferCredits(req, res, next) {
    try {
        const { recipientId, amount, description } = req.body;

        if (!recipientId || !amount || parseFloat(amount) <= 0) {
            return res.status(400).json({
                status: 'error',
                message: 'recipientId and a positive amount are required.',
            });
        }

        const transferAmount = parseFloat(amount);

        // Sender wallet
        const senderWallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
        });

        if (!senderWallet) {
            return res.status(404).json({ status: 'error', message: 'Sender wallet not found.' });
        }

        const senderBalance = parseFloat(senderWallet.balance);

        // VULNERABLE: TOCTOU gap — same as debit
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (senderBalance < transferAmount) {
            return res.status(400).json({
                status: 'error',
                message: 'Insufficient balance for transfer.',
                data: { balance: senderBalance, requested: transferAmount },
            });
        }

        // Recipient wallet (auto-create if missing)
        // VULNERABLE: No validation that recipientId is a real, active user
        // Maps to: OWASP A01:2021 – Broken Access Control
        let recipientWallet = await prisma.wallet.findUnique({
            where: { userId: recipientId },
        });

        if (!recipientWallet) {
            recipientWallet = await prisma.wallet.create({
                data: { userId: recipientId },
            });
        }

        // VULNERABLE: Not wrapped in a DB transaction — partial failure possible
        // (sender debited but recipient not credited, or vice versa)
        // Maps to: OWASP A04:2021 – Insecure Design

        // Debit sender
        await prisma.wallet.update({
            where: { id: senderWallet.id },
            data: { balance: { decrement: transferAmount } },
        });

        // Credit recipient
        await prisma.wallet.update({
            where: { id: recipientWallet.id },
            data: { balance: { increment: transferAmount } },
        });

        // Create transaction records
        await prisma.walletTransaction.createMany({
            data: [
                {
                    walletId: senderWallet.id,
                    type: 'debit',
                    amount: transferAmount,
                    description: description || `Transfer to user ${recipientId}`,
                    referenceId: recipientId,
                    metadata: { transferType: 'outgoing', recipientId },
                },
                {
                    walletId: recipientWallet.id,
                    type: 'credit',
                    amount: transferAmount,
                    description: description || `Transfer from user ${req.user.id}`,
                    referenceId: req.user.id,
                    metadata: { transferType: 'incoming', senderId: req.user.id },
                },
            ],
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'WALLET_TRANSFER',
            entity: 'Wallet',
            metadata: {
                senderId: req.user.id,
                recipientId,
                amount: transferAmount,
            },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `$${transferAmount} transferred to user ${recipientId}.`,
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// WALLET TRANSACTION HISTORY
// ═══════════════════════════

/**
 * GET /api/v1/wallet/transactions
 * List transaction history for the authenticated user's wallet.
 */
async function listTransactions(req, res, next) {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        const wallet = await prisma.wallet.findUnique({
            where: { userId: req.user.id },
        });

        if (!wallet) {
            return res.status(200).json({
                status: 'success',
                data: { transactions: [], pagination: { page: 1, limit: pageSize, totalCount: 0, totalPages: 0 } },
            });
        }

        const where = { walletId: wallet.id };
        if (type) where.type = type;

        const [transactions, totalCount] = await Promise.all([
            prisma.walletTransaction.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.walletTransaction.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                transactions,
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

// ═══════════════════════════
// ADMIN: VIEW ANY WALLET
// ═══════════════════════════

/**
 * GET /api/v1/wallet/admin/:userId
 * Admin can view any user's wallet.
 */
async function adminGetWallet(req, res, next) {
    try {
        const { userId } = req.params;

        const wallet = await prisma.wallet.findUnique({
            where: { userId },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                },
                user: {
                    select: { id: true, email: true, firstName: true, lastName: true },
                },
            },
        });

        if (!wallet) {
            return res.status(404).json({ status: 'error', message: 'Wallet not found for this user.' });
        }

        return res.status(200).json({
            status: 'success',
            data: { wallet },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/wallet/admin/:userId/adjust
 * Admin can adjust (credit/debit) any user's wallet.
 */
async function adminAdjustWallet(req, res, next) {
    try {
        const { userId } = req.params;
        const { amount, type, description } = req.body;

        if (!amount || !type || !['credit', 'debit', 'adjustment'].includes(type)) {
            return res.status(400).json({
                status: 'error',
                message: 'amount and type (credit|debit|adjustment) are required.',
            });
        }

        const adjustAmount = parseFloat(amount);

        let wallet = await prisma.wallet.findUnique({ where: { userId } });

        if (!wallet) {
            wallet = await prisma.wallet.create({ data: { userId } });
        }

        const updateData = type === 'debit'
            ? { balance: { decrement: Math.abs(adjustAmount) } }
            : { balance: { increment: Math.abs(adjustAmount) } };

        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: updateData,
        });

        const transaction = await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type,
                amount: Math.abs(adjustAmount),
                description: description || `Admin ${type}`,
                metadata: { adjustedBy: req.user.id },
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ADMIN_WALLET_ADJUSTMENT',
            entity: 'Wallet',
            entityId: wallet.id,
            metadata: { userId, type, amount: adjustAmount, newBalance: updatedWallet.balance },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `Wallet ${type} applied.`,
            data: {
                wallet: {
                    id: updatedWallet.id,
                    balance: updatedWallet.balance,
                    userId: updatedWallet.userId,
                },
                transaction,
            },
        });
    } catch (error) {
        next(error);
    }
}

export {
    getWallet,
    addCredit,
    debitWallet,
    transferCredits,
    listTransactions,
    adminGetWallet,
    adminAdjustWallet,
};
