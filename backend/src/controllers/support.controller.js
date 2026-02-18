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

export {
    viewOrders,
    viewOrder,
    viewUsers,
    viewUser,
};
