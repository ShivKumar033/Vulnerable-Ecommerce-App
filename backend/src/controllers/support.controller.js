import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Support Controller (Read-Only Access)
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/support/orders
 * Read-only view of all orders for support staff.
 */
async function viewOrders(req, res, next) {
    try {
        const { page = 1, limit = 20, status, orderNumber } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (status) where.status = status;
        if (orderNumber) where.orderNumber = orderNumber;

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    items: {
                        include: { product: { select: { id: true, title: true } } },
                    },
                    payment: { select: { status: true, amount: true } },
                },
            }),
            prisma.order.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                orders,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/orders/:id
 */
async function viewOrder(req, res, next) {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
                items: {
                    include: { product: { select: { id: true, title: true, price: true } } },
                },
                address: true,
                payment: true,
                coupon: true,
            },
        });

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        return res.status(200).json({ status: 'success', data: { order } });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/users
 * Read-only view of users for support staff.
 */
async function viewUsers(req, res, next) {
    try {
        const { page = 1, limit = 20, search } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    isEmailVerified: true,
                    createdAt: true,
                    _count: { select: { orders: true } },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                users,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/users/:id
 */
async function viewUser(req, res, next) {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                role: true,
                isActive: true,
                isEmailVerified: true,
                createdAt: true,
                orders: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
                },
                addresses: true,
            },
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        return res.status(200).json({ status: 'success', data: { user } });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// SUPPORT SPECIFIC FEATURES
// ═══════════════════════════

/**
 * GET /api/v1/support/users/:id/loyalty
 * View user's loyalty points balance
 */
async function viewUserLoyalty(req, res, next) {
    try {
        const { id } = req.params;

        const loyaltyPoints = await prisma.loyaltyPoint.findUnique({
            where: { userId: id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!loyaltyPoints) {
            return res.status(200).json({
                status: 'success',
                data: {
                    balance: 0,
                    lifetimeEarnings: 0,
                    transactions: [],
                },
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                balance: loyaltyPoints.balance,
                lifetimeEarnings: loyaltyPoints.lifetimeEarnings,
                transactions: loyaltyPoints.transactions,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/users/:id/wallet
 * View user's wallet/store credit balance
 */
async function viewUserWallet(req, res, next) {
    try {
        const { id } = req.params;

        const wallet = await prisma.wallet.findUnique({
            where: { userId: id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                },
            },
        });

        if (!wallet) {
            return res.status(200).json({
                status: 'success',
                data: {
                    balance: 0,
                    currency: 'USD',
                    transactions: [],
                },
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                balance: wallet.balance,
                currency: wallet.currency,
                transactions: wallet.transactions,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/coupons/:id/usage
 * View coupon usage history
 */
async function viewCouponUsage(req, res, next) {
    try {
        const { id } = req.params;

        const coupon = await prisma.coupon.findUnique({
            where: { id },
            include: {
                orders: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    },
                },
            },
        });

        if (!coupon) {
            return res.status(404).json({ status: 'error', message: 'Coupon not found.' });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                coupon: {
                    id: coupon.id,
                    code: coupon.code,
                    discountType: coupon.discountType,
                    discountValue: coupon.discountValue,
                    maxUses: coupon.maxUses,
                    currentUses: coupon.currentUses,
                    isActive: coupon.isActive,
                },
                usageHistory: coupon.orders,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/audit-logs
 * View audit logs (read-only)
 */
async function viewAuditLogs(req, res, next) {
    try {
        const { page = 1, limit = 50, action, userId, entity } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (action) where.action = { contains: action };
        if (userId) where.userId = userId;
        if (entity) where.entity = entity;

        const [logs, totalCount] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                },
            }),
            prisma.auditLog.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                auditLogs: logs,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/support/orders/:id/notes
 * Add internal note to an order
 */
async function addOrderNote(req, res, next) {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ status: 'error', message: 'Note content is required.' });
        }

        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        const note = await prisma.orderNote.create({
            data: {
                orderId: id,
                userId: req.user.id,
                content,
                isInternal: true,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ORDER_NOTE_ADDED',
            entity: 'OrderNote',
            entityId: note.id,
            metadata: { orderId: id },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Note added to order.',
            data: { note },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/orders/:id/notes
 * Get internal notes for an order
 */
async function getOrderNotes(req, res, next) {
    try {
        const { id } = req.params;

        const notes = await prisma.orderNote.findMany({
            where: { orderId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
        });

        return res.status(200).json({
            status: 'success',
            data: { notes },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/support/orders/:id/escalate
 * Escalate flagged order to admin
 */
async function escalateOrder(req, res, next) {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ status: 'error', message: 'Escalation reason is required.' });
        }

        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        await createAuditLog({
            userId: req.user.id,
            action: 'ORDER_ESCALATED_TO_ADMIN',
            entity: 'Order',
            entityId: id,
            metadata: { reason, escalatedBy: req.user.id },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Order escalated to admin.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/ip-blacklist
 * View IP blacklist (read-only for support)
 */
async function viewIpBlacklist(req, res, next) {
    try {
        const blockedIps = await prisma.ipBlacklist.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, email: true } },
            },
        });

        return res.status(200).json({
            status: 'success',
            data: { blockedIps },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/search/users
 * Search users
 */
async function searchUsers(req, res, next) {
    try {
        const { q, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        if (!q) {
            return res.status(400).json({ status: 'error', message: 'Search query is required.' });
        }

        const where = {
            OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
            ],
        };

        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    _count: { select: { orders: true } },
                },
            }),
            prisma.user.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                users,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/support/search/orders
 * Search orders
 */
async function searchOrders(req, res, next) {
    try {
        const { q, page = 1, limit = 20, status } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        if (!q) {
            return res.status(400).json({ status: 'error', message: 'Search query is required.' });
        }

        const where = {
            OR: [
                { orderNumber: { contains: q, mode: 'insensitive' } },
                { notes: { contains: q, mode: 'insensitive' } },
            ],
        };

        if (status) {
            where.status = status;
        }

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    payment: { select: { status: true, amount: true } },
                },
            }),
            prisma.order.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                orders,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

export {
    viewOrders,
    viewOrder,
    viewUsers,
    viewUser,
    // New support features
    viewUserLoyalty,
    viewUserWallet,
    viewCouponUsage,
    viewAuditLogs,
    addOrderNote,
    getOrderNotes,
    escalateOrder,
    viewIpBlacklist,
    searchUsers,
    searchOrders,
};
