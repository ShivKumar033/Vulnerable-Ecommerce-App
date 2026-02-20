import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Vendor Controller
// Covers: Product management, Orders, Discounts, Returns, Profile
// ──────────────────────────────────────────────────────────────

// ═══════════════════════════
// VENDOR DISCOUNTS
// ═══════════════════════════

/**
 * GET /api/v1/vendor/discounts
 * List vendor's own discounts
 */
async function listDiscounts(req, res, next) {
    try {
        const vendorId = req.user.id;

        const discounts = await prisma.vendorDiscount.findMany({
            where: { vendorId },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ status: 'success', data: { discounts } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/vendor/discounts
 * Create a discount for vendor's products
 */
async function createDiscount(req, res, next) {
    try {
        const vendorId = req.user.id;
        const { name, description, discountType, discountValue, minOrderAmount, maxUses, startsAt, expiresAt } = req.body;

        if (!name || !discountValue) {
            return res.status(400).json({ status: 'error', message: 'name and discountValue are required.' });
        }

        const discount = await prisma.vendorDiscount.create({
            data: {
                vendorId,
                name,
                description: description || null,
                discountType: discountType || 'percentage',
                discountValue: parseFloat(discountValue),
                minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
                maxUses: maxUses ? parseInt(maxUses, 10) : null,
                startsAt: startsAt ? new Date(startsAt) : null,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
        });

        await createAuditLog({
            userId: vendorId,
            action: 'VENDOR_DISCOUNT_CREATED',
            entity: 'VendorDiscount',
            entityId: discount.id,
            metadata: { name, discountType, discountValue },
            req,
        });

        return res.status(201).json({ status: 'success', message: 'Discount created.', data: { discount } });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/vendor/discounts/:id
 * Update a discount
 */
async function updateDiscount(req, res, next) {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;
        const { name, description, discountType, discountValue, minOrderAmount, maxUses, isActive, startsAt, expiresAt } = req.body;

        // Verify ownership
        const existing = await prisma.vendorDiscount.findFirst({
            where: { id, vendorId },
        });

        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Discount not found.' });
        }

        const discount = await prisma.vendorDiscount.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(discountType !== undefined && { discountType }),
                ...(discountValue !== undefined && { discountValue: parseFloat(discountValue) }),
                ...(minOrderAmount !== undefined && { minOrderAmount: parseFloat(minOrderAmount) }),
                ...(maxUses !== undefined && { maxUses: parseInt(maxUses, 10) }),
                ...(isActive !== undefined && { isActive }),
                ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
                ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
            },
        });

        return res.status(200).json({ status: 'success', message: 'Discount updated.', data: { discount } });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/vendor/discounts/:id
 * Delete a discount
 */
async function deleteDiscount(req, res, next) {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;

        // Verify ownership
        const existing = await prisma.vendorDiscount.findFirst({
            where: { id, vendorId },
        });

        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Discount not found.' });
        }

        await prisma.vendorDiscount.delete({
            where: { id },
        });

        await createAuditLog({
            userId: vendorId,
            action: 'VENDOR_DISCOUNT_DELETED',
            entity: 'VendorDiscount',
            entityId: id,
            req,
        });

        return res.status(200).json({ status: 'success', message: 'Discount deleted.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// VENDOR PROFILE (SSTI Vulnerable)
// ═══════════════════════════

/**
 * GET /api/v1/vendor/profile
 * Get vendor profile with bio (SSTI vulnerable template rendering)
 */
async function getProfile(req, res, next) {
    try {
        const vendorId = req.user.id;

        const vendor = await prisma.user.findUnique({
            where: { id: vendorId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                bio: true,
                displayName: true,
                avatar: true,
                createdAt: true,
                _count: { select: { products: true, orders: true } },
            },
        });

        if (!vendor) {
            return res.status(404).json({ status: 'error', message: 'Vendor not found.' });
        }

        // VULNERABLE: Server-Side Template Injection (SSTI)
        // The bio field is rendered using template injection
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – Server-Side Template Injection
        
        // Return raw bio for SSTI exploitation
        return res.status(200).json({
            status: 'success',
            data: {
                vendor: {
                    ...vendor,
                    bioRaw: vendor.bio, // Raw bio for SSTI
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/vendor/profile
 * Update vendor profile with bio (SSTI vulnerable)
 */
async function updateProfile(req, res, next) {
    try {
        const vendorId = req.user.id;
        const { firstName, lastName, phone, bio, displayName, avatar } = req.body;

        // VULNERABLE: SSTI - bio field can contain template injection payloads
        // The bio is stored and can be rendered in various places
        const vendor = await prisma.user.update({
            where: { id: vendorId },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(bio !== undefined && { bio }), // SSTI payload storage
                ...(displayName !== undefined && { displayName }),
                ...(avatar !== undefined && { avatar }),
            },
        });

        await createAuditLog({
            userId: vendorId,
            action: 'VENDOR_PROFILE_UPDATED',
            entity: 'User',
            entityId: vendorId,
            metadata: { updatedFields: Object.keys(req.body) },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Profile updated.',
            data: {
                vendor: {
                    id: vendor.id,
                    email: vendor.email,
                    firstName: vendor.firstName,
                    lastName: vendor.lastName,
                    displayName: vendor.displayName,
                    bio: vendor.bio,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/vendor/profile/render
 * Render vendor profile bio (SSTI vulnerable endpoint)
 */
async function renderProfileBio(req, res, next) {
    try {
        const vendorId = req.user.id;

        const vendor = await prisma.user.findUnique({
            where: { id: vendorId },
            select: { bio: true, displayName: true },
        });

        if (!vendor) {
            return res.status(404).json({ status: 'error', message: 'Vendor not found.' });
        }

        // VULNERABLE: SSTI - direct rendering of user input without sanitization
        // Using simple template engine that evaluates expressions
        const template = vendor.bio || '';
        
        // Simple template evaluation (unsafe)
        let rendered = template;
        
        // Replace common template patterns
        // This is intentionally vulnerable for security testing
        try {
            // Attempt to evaluate embedded expressions
            // Pattern: {{ expression }} or <%= expression %>
            rendered = template.replace(/\{\{(.*?)\}\}/g, (match, expr) => {
                try {
                    // Dangerous: evaluating user input
                    return eval(expr);
                } catch (e) {
                    return match;
                }
            });
            
            rendered = rendered.replace(/<%=(.*?)%>/g, (match, expr) => {
                try {
                    return eval(expr);
                } catch (e) {
                    return match;
                }
            });
        } catch (e) {
            // Return raw if evaluation fails
        }

        return res.status(200).json({
            status: 'success',
            data: {
                displayName: vendor.displayName,
                bioRendered: rendered,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// VENDOR RETURNS
// ═══════════════════════════

/**
 * GET /api/v1/vendor/returns
 * List returns for vendor's products
 */
async function listReturns(req, res, next) {
    try {
        const vendorId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        // Find products owned by this vendor
        const vendorProductIds = await prisma.product.findMany({
            where: { vendorId },
            select: { id: true },
        });
        const productIds = vendorProductIds.map(p => p.id);

        // Find return requests for orders containing vendor's products
        const where = {
            order: {
                items: {
                    some: {
                        productId: { in: productIds },
                    },
                },
            },
        };

        if (status) {
            where.status = status;
        }

        const [returns, totalCount] = await Promise.all([
            prisma.returnRequest.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    order: { 
                        select: { 
                            id: true, 
                            orderNumber: true, 
                            totalAmount: true,
                            items: {
                                where: { productId: { in: productIds } },
                                include: { product: { select: { id: true, title: true } } },
                            },
                        } 
                    },
                },
            }),
            prisma.returnRequest.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                returns,
                pagination: { page: pageNum, limit: pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize) },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/vendor/returns/:id/approve
 * Vendor approves a return request
 */
async function approveReturn(req, res, next) {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;
        const { adminNotes } = req.body;

        // Verify the return is for vendor's product
        const returnRequest = await prisma.returnRequest.findFirst({
            where: { id },
            include: {
                order: {
                    include: {
                        items: {
                            include: { product: true },
                        },
                    },
                },
            },
        });

        if (!returnRequest) {
            return res.status(404).json({ status: 'error', message: 'Return request not found.' });
        }

        // Check if vendor owns any products in this order
        const vendorItems = returnRequest.order.items.filter(item => item.product.vendorId === vendorId);
        if (vendorItems.length === 0) {
            return res.status(403).json({ status: 'error', message: 'This return does not involve your products.' });
        }

        if (returnRequest.status !== 'PENDING') {
            return res.status(400).json({ status: 'error', message: 'Return request is not pending.' });
        }

        const updated = await prisma.returnRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: vendorId,
                resolvedAt: new Date(),
                adminNotes: adminNotes || null,
            },
        });

        await createAuditLog({
            userId: vendorId,
            action: 'VENDOR_RETURN_APPROVED',
            entity: 'ReturnRequest',
            entityId: id,
            metadata: { orderId: returnRequest.orderId, refundAmount: returnRequest.refundAmount },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Return request approved.',
            data: { returnRequest: updated },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/vendor/returns/:id/reject
 * Vendor rejects a return request
 */
async function rejectReturn(req, res, next) {
    try {
        const { id } = req.params;
        const vendorId = req.user.id;
        const { adminNotes } = req.body;

        // Verify the return is for vendor's product
        const returnRequest = await prisma.returnRequest.findFirst({
            where: { id },
            include: { order: { include: { items: { include: { product: true } } } } },
        });

        if (!returnRequest) {
            return res.status(404).json({ status: 'error', message: 'Return request not found.' });
        }

        // Check if vendor owns any products in this order
        const vendorItems = returnRequest.order.items.filter(item => item.product.vendorId === vendorId);
        if (vendorItems.length === 0) {
            return res.status(403).json({ status: 'error', message: 'This return does not involve your products.' });
        }

        if (returnRequest.status !== 'PENDING') {
            return res.status(400).json({ status: 'error', message: 'Return request is not pending.' });
        }

        const updated = await prisma.returnRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: vendorId,
                resolvedAt: new Date(),
                adminNotes: adminNotes || null,
            },
        });

        await createAuditLog({
            userId: vendorId,
            action: 'VENDOR_RETURN_REJECTED',
            entity: 'ReturnRequest',
            entityId: id,
            metadata: { orderId: returnRequest.orderId },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Return request rejected.',
            data: { returnRequest: updated },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// VENDOR DASHBOARD STATS
// ═══════════════════════════

/**
 * GET /api/v1/vendor/dashboard
 * Get vendor dashboard statistics
 */
async function getDashboard(req, res, next) {
    try {
        const vendorId = req.user.id;

        const [
            totalProducts,
            activeProducts,
            totalOrders,
            totalRevenue,
            pendingReturns,
            recentOrders,
        ] = await Promise.all([
            prisma.product.count({ where: { vendorId } }),
            prisma.product.count({ where: { vendorId, isActive: true } }),
            prisma.order.count({
                where: {
                    items: { some: { product: { vendorId } } },
                },
            }),
            prisma.orderItem.aggregate({
                _sum: { price: true },
                where: { product: { vendorId } },
            }),
            prisma.returnRequest.count({
                where: {
                    order: { items: { some: { product: { vendorId } } } },
                    status: 'PENDING',
                },
            }),
            prisma.order.findMany({
                where: { items: { some: { product: { vendorId } } } },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    items: {
                        where: { product: { vendorId } },
                        include: { product: { select: { id: true, title: true } } },
                    },
                },
            }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                stats: {
                    totalProducts,
                    activeProducts,
                    totalOrders,
                    totalRevenue: totalRevenue._sum.price || 0,
                    pendingReturns,
                },
                recentOrders,
            },
        });
    } catch (error) {
        next(error);
    }
}

export {
    // Discounts
    listDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    // Profile
    getProfile,
    updateProfile,
    renderProfileBio,
    // Returns
    listReturns,
    approveReturn,
    rejectReturn,
    // Dashboard
    getDashboard,
};

