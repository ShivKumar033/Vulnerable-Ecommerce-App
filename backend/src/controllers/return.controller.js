import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Return Request Controller
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/returns
 * List user's return requests
 */
async function listReturnRequests(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        
        // Users see their own, admins/support see all
        if (req.user.role === 'USER') {
            where.userId = req.user.id;
        } else if (req.user.role === 'VENDOR') {
            // Vendors see returns for their products
            where.order = {
                items: {
                    some: {
                        product: { vendorId: req.user.id }
                    }
                }
            };
        }

        if (status) {
            where.status = status;
        }

        const returnRequests = await prisma.returnRequest.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                order: { select: { id: true, orderNumber: true, totalAmount: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        const total = await prisma.returnRequest.count({ where });

        return res.status(200).json({
            status: 'success',
            data: {
                returnRequests,
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
 * POST /api/v1/returns
 * Submit a return request
 */
async function createReturnRequest(req, res, next) {
    try {
        const { orderId, reason, items, refundAmount } = req.body;

        if (!orderId || !reason || !items || !refundAmount) {
            return res.status(400).json({
                status: 'error',
                message: 'orderId, reason, items, and refundAmount are required.',
            });
        }

        // Verify order exists and belongs to user
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId: req.user.id,
            },
            include: { items: true },
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found.',
            });
        }

        // Only allow returns for delivered orders
        if (order.status !== 'DELIVERED') {
            return res.status(400).json({
                status: 'error',
                message: 'Only delivered orders can be returned.',
            });
        }

        // Check if return already exists
        const existingReturn = await prisma.returnRequest.findFirst({
            where: {
                orderId,
                userId: req.user.id,
                status: { notIn: ['REJECTED', 'COMPLETED'] },
            },
        });

        if (existingReturn) {
            return res.status(400).json({
                status: 'error',
                message: 'A return request already exists for this order.',
            });
        }

        const returnRequest = await prisma.returnRequest.create({
            data: {
                orderId,
                userId: req.user.id,
                reason,
                items: JSON.stringify(items),
                refundAmount,
                status: 'PENDING',
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'RETURN_REQUEST_SUBMITTED',
            entity: 'ReturnRequest',
            entityId: returnRequest.id,
            metadata: { orderId, refundAmount },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Return request submitted successfully.',
            data: { returnRequest },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/returns/:id
 * Get return request details
 */
async function getReturnRequest(req, res, next) {
    try {
        const { id } = req.params;

        const returnRequest = await prisma.returnRequest.findUnique({
            where: { id },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                order: { 
                    select: { 
                        id: true, 
                        orderNumber: true, 
                        totalAmount: true,
                        items: {
                            include: {
                                product: { select: { id: true, title: true } }
                            }
                        }
                    } 
                },
            },
        });

        if (!returnRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'Return request not found.',
            });
        }

        // Check ownership for non-admin users
        if (req.user.role === 'USER' && returnRequest.userId !== req.user.id) {
            return res.status(403).json({
                status: 'error',
                message: 'Access denied.',
            });
        }

        // Parse items JSON
        const parsedReturn = {
            ...returnRequest,
            items: JSON.parse(returnRequest.items),
        };

        return res.status(200).json({
            status: 'success',
            data: { returnRequest: parsedReturn },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/returns/:id/approve
 * Approve a return request (Admin/Vendor only)
 */
async function approveReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;

        const returnRequest = await prisma.returnRequest.findUnique({
            where: { id },
            include: { order: true },
        });

        if (!returnRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'Return request not found.',
            });
        }

        if (returnRequest.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: 'Return request is not pending.',
            });
        }

        // VULNERABLE: No proper authorization check - any authenticated user can approve
        // Maps to: OWASP A01:2021 – Broken Access Control
        const updated = await prisma.returnRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: req.user.id,
                resolvedAt: new Date(),
                adminNotes: adminNotes || null,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'RETURN_REQUEST_APPROVED',
            entity: 'ReturnRequest',
            entityId: returnRequest.id,
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
 * PUT /api/v1/returns/:id/reject
 * Reject a return request (Admin/Vendor only)
 */
async function rejectReturnRequest(req, res, next) {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;

        const returnRequest = await prisma.returnRequest.findUnique({
            where: { id },
        });

        if (!returnRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'Return request not found.',
            });
        }

        if (returnRequest.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: 'Return request is not pending.',
            });
        }

        // VULNERABLE: No proper authorization check
        const updated = await prisma.returnRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                approvedById: req.user.id,
                resolvedAt: new Date(),
                adminNotes: adminNotes || null,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'RETURN_REQUEST_REJECTED',
            entity: 'ReturnRequest',
            entityId: returnRequest.id,
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

/**
 * PUT /api/v1/returns/:id/complete
 * Complete a return request and process refund (Admin only)
 */
async function completeReturnRequest(req, res, next) {
    try {
        const { id } = req.params;

        const returnRequest = await prisma.returnRequest.findUnique({
            where: { id },
            include: { order: true },
        });

        if (!returnRequest) {
            return res.status(404).json({
                status: 'error',
                message: 'Return request not found.',
            });
        }

        if (returnRequest.status !== 'APPROVED') {
            return res.status(400).json({
                status: 'error',
                message: 'Return request must be approved first.',
            });
        }

        // VULNERABLE: No transaction locking - can issue refund multiple times
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Race Conditions (Refund Issued Multiple Times)
        const updated = await prisma.returnRequest.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                resolvedAt: new Date(),
            },
        });

        // Process refund to wallet
        let wallet = await prisma.wallet.findUnique({
            where: { userId: returnRequest.userId },
        });

        if (!wallet) {
            wallet = await prisma.wallet.create({
                data: { userId: returnRequest.userId },
            });
        }

        // Add refund to wallet
        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: returnRequest.refundAmount } },
        });

        await prisma.walletTransaction.create({
            data: {
                walletId: wallet.id,
                type: 'refund',
                amount: returnRequest.refundAmount,
                description: `Refund for return request ${id}`,
                referenceId: returnRequest.orderId,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'RETURN_REQUEST_COMPLETED',
            entity: 'ReturnRequest',
            entityId: returnRequest.id,
            metadata: { 
                orderId: returnRequest.orderId, 
                refundAmount: returnRequest.refundAmount,
                refundedTo: 'wallet'
            },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Return completed and refund processed to wallet.',
            data: { returnRequest: updated },
        });
    } catch (error) {
        next(error);
    }
}

export {
    listReturnRequests,
    createReturnRequest,
    getReturnRequest,
    approveReturnRequest,
    rejectReturnRequest,
    completeReturnRequest,
};

