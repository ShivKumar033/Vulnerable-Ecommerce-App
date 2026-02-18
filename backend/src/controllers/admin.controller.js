const { prisma } = require('../config/db');
const { createAuditLog } = require('../utils/auditLog');
const { hashPassword } = require('../utils/password');

// ──────────────────────────────────────────────────────────────
// Admin Controller
// Covers: User Management, Product Moderation, Inventory,
//         Coupons, Feature Flags, Sales Analytics,
//         Bulk Operations, Audit Log Viewing
// ──────────────────────────────────────────────────────────────

// ═══════════════════════════
// USER MANAGEMENT
// ═══════════════════════════

/**
 * GET /api/v1/admin/users
 * List all users with pagination.
 */
async function listUsers(req, res, next) {
    try {
        const { page = 1, limit = 20, role, search } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (role) where.role = role;
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
                // VULNERABLE: Excessive data exposure — returning all user fields
                // Maps to: OWASP API3:2019 – Excessive Data Exposure
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    role: true,
                    isEmailVerified: true,
                    isActive: true,
                    createdAt: true,
                    _count: { select: { orders: true, products: true } },
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
 * GET /api/v1/admin/users/:id
 * Get a single user's details.
 */
async function getUser(req, res, next) {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                addresses: true,
                orders: { take: 10, orderBy: { createdAt: 'desc' }, select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true } },
                products: { select: { id: true, title: true, price: true, stock: true, isActive: true } },
                auditLogs: { take: 20, orderBy: { createdAt: 'desc' } },
                savedPayments: true,
                oauthAccounts: { select: { id: true, provider: true, email: true } },
            },
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        // VULNERABLE: Excessive data exposure — returning password hash to admin
        // Maps to: OWASP API3:2019 – Excessive Data Exposure
        return res.status(200).json({ status: 'success', data: { user } });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/admin/users/:id
 * Update a user (role change, deactivation, etc.).
 */
async function updateUser(req, res, next) {
    try {
        const { id } = req.params;
        const { role, isActive, isEmailVerified, firstName, lastName, phone } = req.body;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                ...(role !== undefined && { role }),
                ...(isActive !== undefined && { isActive }),
                ...(isEmailVerified !== undefined && { isEmailVerified }),
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(phone !== undefined && { phone }),
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ADMIN_USER_UPDATED',
            entity: 'User',
            entityId: id,
            metadata: { changes: req.body },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'User updated.',
            data: { user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive } },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/admin/users/:id
 * Delete a user account.
 */
async function deleteUser(req, res, next) {
    try {
        const { id } = req.params;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        await prisma.user.delete({ where: { id } });

        await createAuditLog({
            userId: req.user.id,
            action: 'ADMIN_USER_DELETED',
            entity: 'User',
            entityId: id,
            req,
        });

        return res.status(200).json({ status: 'success', message: 'User deleted.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// PRODUCT MODERATION
// ═══════════════════════════

/**
 * GET /api/v1/admin/products
 * List all products for moderation (including inactive).
 */
async function listAllProducts(req, res, next) {
    try {
        const { page = 1, limit = 20, isActive, vendorId } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (isActive !== undefined) where.isActive = isActive === 'true';
        if (vendorId) where.vendorId = vendorId;

        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    vendor: { select: { id: true, email: true, firstName: true, lastName: true } },
                    category: { select: { id: true, name: true, slug: true } },
                    _count: { select: { reviews: true, orderItems: true } },
                },
            }),
            prisma.product.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                products,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/admin/products/:id/moderate
 * Approve or reject (toggle active) a product.
 */
async function moderateProduct(req, res, next) {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const product = await prisma.product.update({
            where: { id },
            data: { isActive },
        });

        await createAuditLog({
            userId: req.user.id,
            action: isActive ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED',
            entity: 'Product',
            entityId: id,
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `Product ${isActive ? 'approved' : 'rejected'}.`,
            data: { product: { id: product.id, title: product.title, isActive: product.isActive } },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// INVENTORY CONTROL
// ═══════════════════════════

/**
 * GET /api/v1/admin/inventory
 * View inventory levels across all products.
 */
async function getInventory(req, res, next) {
    try {
        const { lowStock = 10, page = 1, limit = 50 } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * pageSize;

        const [products, totalCount, lowStockCount] = await Promise.all([
            prisma.product.findMany({
                skip,
                take: pageSize,
                orderBy: { stock: 'asc' },
                select: {
                    id: true,
                    title: true,
                    sku: true,
                    stock: true,
                    price: true,
                    isActive: true,
                    vendor: { select: { id: true, firstName: true, lastName: true } },
                    variants: { select: { id: true, name: true, value: true, stock: true } },
                },
            }),
            prisma.product.count(),
            prisma.product.count({ where: { stock: { lte: parseInt(lowStock, 10) } } }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                inventory: products,
                lowStockCount,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/admin/inventory/:productId
 * Update stock for a specific product.
 */
async function updateStock(req, res, next) {
    try {
        const { productId } = req.params;
        const { stock, variantId, variantStock } = req.body;

        if (stock !== undefined) {
            await prisma.product.update({
                where: { id: productId },
                data: { stock: parseInt(stock, 10) },
            });
        }

        if (variantId && variantStock !== undefined) {
            await prisma.productVariant.update({
                where: { id: variantId },
                data: { stock: parseInt(variantStock, 10) },
            });
        }

        await createAuditLog({
            userId: req.user.id,
            action: 'INVENTORY_UPDATED',
            entity: 'Product',
            entityId: productId,
            metadata: req.body,
            req,
        });

        return res.status(200).json({ status: 'success', message: 'Inventory updated.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// COUPON MANAGEMENT
// ═══════════════════════════

/**
 * GET /api/v1/admin/coupons
 */
async function listCoupons(req, res, next) {
    try {
        const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
        return res.status(200).json({ status: 'success', data: { coupons } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/coupons
 */
async function createCoupon(req, res, next) {
    try {
        const { code, description, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = req.body;

        if (!code || !discountValue) {
            return res.status(400).json({ status: 'error', message: 'code and discountValue are required.' });
        }

        const coupon = await prisma.coupon.create({
            data: {
                code: code.toUpperCase(),
                description: description || null,
                discountType: discountType || 'percentage',
                discountValue: parseFloat(discountValue),
                minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
                maxUses: maxUses ? parseInt(maxUses, 10) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'COUPON_CREATED',
            entity: 'Coupon',
            entityId: coupon.id,
            metadata: { code, discountType, discountValue },
            req,
        });

        return res.status(201).json({ status: 'success', message: 'Coupon created.', data: { coupon } });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ status: 'error', message: 'Coupon code already exists.' });
        }
        next(error);
    }
}

/**
 * PUT /api/v1/admin/coupons/:id
 */
async function updateCoupon(req, res, next) {
    try {
        const { id } = req.params;
        const { code, description, discountType, discountValue, minOrderAmount, maxUses, isActive, expiresAt } = req.body;

        const coupon = await prisma.coupon.update({
            where: { id },
            data: {
                ...(code !== undefined && { code: code.toUpperCase() }),
                ...(description !== undefined && { description }),
                ...(discountType !== undefined && { discountType }),
                ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) }),
                ...(minOrderAmount !== undefined && { minOrderAmount: parseFloat(minOrderAmount) }),
                ...(maxUses !== undefined && { maxUses: parseInt(maxUses, 10) }),
                ...(isActive !== undefined && { isActive }),
                ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
            },
        });

        return res.status(200).json({ status: 'success', message: 'Coupon updated.', data: { coupon } });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/admin/coupons/:id
 */
async function deleteCoupon(req, res, next) {
    try {
        const { id } = req.params;
        await prisma.coupon.delete({ where: { id } });
        return res.status(200).json({ status: 'success', message: 'Coupon deleted.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// FEATURE FLAGS
// ═══════════════════════════

/**
 * GET /api/v1/admin/feature-flags
 */
async function listFeatureFlags(req, res, next) {
    try {
        const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
        return res.status(200).json({ status: 'success', data: { featureFlags: flags } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/feature-flags
 */
async function createFeatureFlag(req, res, next) {
    try {
        const { key, value, description } = req.body;

        if (!key) {
            return res.status(400).json({ status: 'error', message: 'key is required.' });
        }

        const flag = await prisma.featureFlag.create({
            data: { key, value: value || false, description: description || null },
        });

        return res.status(201).json({ status: 'success', message: 'Feature flag created.', data: { featureFlag: flag } });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ status: 'error', message: 'Feature flag key already exists.' });
        }
        next(error);
    }
}

/**
 * PUT /api/v1/admin/feature-flags/:id
 */
async function updateFeatureFlag(req, res, next) {
    try {
        const { id } = req.params;
        const { value, description } = req.body;

        const flag = await prisma.featureFlag.update({
            where: { id },
            data: {
                ...(value !== undefined && { value }),
                ...(description !== undefined && { description }),
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'FEATURE_FLAG_UPDATED',
            entity: 'FeatureFlag',
            entityId: id,
            metadata: { key: flag.key, value: flag.value },
            req,
        });

        return res.status(200).json({ status: 'success', message: 'Feature flag updated.', data: { featureFlag: flag } });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/admin/feature-flags/:id
 */
async function deleteFeatureFlag(req, res, next) {
    try {
        const { id } = req.params;
        await prisma.featureFlag.delete({ where: { id } });
        return res.status(200).json({ status: 'success', message: 'Feature flag deleted.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// SALES ANALYTICS
// ═══════════════════════════

/**
 * GET /api/v1/admin/analytics
 * Basic sales analytics dashboard data.
 */
async function getAnalytics(req, res, next) {
    try {
        const [
            totalUsers,
            totalOrders,
            totalProducts,
            totalRevenue,
            ordersByStatus,
            recentOrders,
            topProducts,
            usersByRole,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.order.count(),
            prisma.product.count(),
            prisma.order.aggregate({
                _sum: { totalAmount: true },
                where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } },
            }),
            prisma.order.groupBy({
                by: ['status'],
                _count: true,
            }),
            prisma.order.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    payment: { select: { status: true, amount: true } },
                },
            }),
            prisma.orderItem.groupBy({
                by: ['productId'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 10,
            }),
            prisma.user.groupBy({
                by: ['role'],
                _count: true,
            }),
        ]);

        // Enrich top products with titles
        const topProductIds = topProducts.map((p) => p.productId);
        const productDetails = await prisma.product.findMany({
            where: { id: { in: topProductIds } },
            select: { id: true, title: true, price: true },
        });
        const productMap = {};
        productDetails.forEach((p) => { productMap[p.id] = p; });

        const enrichedTopProducts = topProducts.map((tp) => ({
            ...tp,
            product: productMap[tp.productId] || null,
        }));

        return res.status(200).json({
            status: 'success',
            data: {
                analytics: {
                    totalUsers,
                    totalOrders,
                    totalProducts,
                    totalRevenue: totalRevenue._sum.totalAmount || 0,
                    ordersByStatus,
                    usersByRole,
                    recentOrders,
                    topProducts: enrichedTopProducts,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// AUDIT LOGS (read)
// ═══════════════════════════

/**
 * GET /api/v1/admin/audit-logs
 * View audit logs with pagination and filtering.
 */
async function listAuditLogs(req, res, next) {
    try {
        const { page = 1, limit = 50, action, userId, entity } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 50;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (action) where.action = action;
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

        // VULNERABLE: Excessive data exposure — returning full metadata
        // which may contain passwords, card numbers, etc.
        // Maps to: OWASP API3:2019 – Excessive Data Exposure
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

// ═══════════════════════════
// BULK OPERATIONS
// ═══════════════════════════

/**
 * POST /api/v1/admin/bulk/users
 * Bulk update users (e.g., deactivate multiple).
 */
async function bulkUpdateUsers(req, res, next) {
    try {
        const { userIds, updates } = req.body;

        if (!Array.isArray(userIds) || !updates) {
            return res.status(400).json({
                status: 'error',
                message: 'userIds (array) and updates (object) are required.',
            });
        }

        const result = await prisma.user.updateMany({
            where: { id: { in: userIds } },
            data: updates,
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'BULK_USERS_UPDATED',
            entity: 'User',
            metadata: { userIds, updates, affectedCount: result.count },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `${result.count} user(s) updated.`,
            data: { affectedCount: result.count },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/bulk/products
 * Bulk update products (e.g., deactivate multiple).
 */
async function bulkUpdateProducts(req, res, next) {
    try {
        const { productIds, updates } = req.body;

        if (!Array.isArray(productIds) || !updates) {
            return res.status(400).json({
                status: 'error',
                message: 'productIds (array) and updates (object) are required.',
            });
        }

        const result = await prisma.product.updateMany({
            where: { id: { in: productIds } },
            data: updates,
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'BULK_PRODUCTS_UPDATED',
            entity: 'Product',
            metadata: { productIds, updates, affectedCount: result.count },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `${result.count} product(s) updated.`,
            data: { affectedCount: result.count },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/admin/bulk/orders
 * Bulk update order statuses.
 */
async function bulkUpdateOrders(req, res, next) {
    try {
        const { orderIds, status } = req.body;

        if (!Array.isArray(orderIds) || !status) {
            return res.status(400).json({
                status: 'error',
                message: 'orderIds (array) and status are required.',
            });
        }

        const result = await prisma.order.updateMany({
            where: { id: { in: orderIds } },
            data: { status },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'BULK_ORDERS_UPDATED',
            entity: 'Order',
            metadata: { orderIds, status, affectedCount: result.count },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: `${result.count} order(s) updated.`,
            data: { affectedCount: result.count },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// ORDER CANCELLATION (stock release)
// ═══════════════════════════

/**
 * POST /api/v1/admin/orders/:id/cancel
 * Cancel an order and release stock.
 */
async function cancelOrder(req, res, next) {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        if (order.status === 'CANCELLED') {
            return res.status(400).json({ status: 'error', message: 'Order is already cancelled.' });
        }

        // Release stock for each item
        for (const item of order.items) {
            await prisma.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
            });
        }

        await prisma.order.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ORDER_CANCELLED_STOCK_RELEASED',
            entity: 'Order',
            entityId: id,
            metadata: { itemCount: order.items.length },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Order cancelled. Stock released.',
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    // Users
    listUsers,
    getUser,
    updateUser,
    deleteUser,
    // Product moderation
    listAllProducts,
    moderateProduct,
    // Inventory
    getInventory,
    updateStock,
    // Coupons
    listCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    // Feature flags
    listFeatureFlags,
    createFeatureFlag,
    updateFeatureFlag,
    deleteFeatureFlag,
    // Analytics
    getAnalytics,
    // Audit logs
    listAuditLogs,
    // Bulk
    bulkUpdateUsers,
    bulkUpdateProducts,
    bulkUpdateOrders,
    // Orders
    cancelOrder,
};
