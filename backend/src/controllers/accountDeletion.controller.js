import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Account Deletion Request Controller
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/users/delete-account
 * Submit account deletion request
 */
async function requestAccountDeletion(req, res, next) {
    try {
        const { reason } = req.body;

        // Check if request already exists
        const existingRequest = await prisma.accountDeletionRequest.findFirst({
            where: {
                userId: req.user.id,
                status: 'PENDING',
            },
        });

        if (existingRequest) {
            return res.status(400).json({
                status: 'error',
                message: 'A deletion request is already pending.',
            });
        }

        const deletionRequest = await prisma.accountDeletionRequest.create({
            data: {
                userId: req.user.id,
                reason: reason || null,
                status: 'PENDING',
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ACCOUNT_DELETION_REQUESTED',
            entity: 'AccountDeletionRequest',
            entityId: deletionRequest.id,
            metadata: { reason },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Account deletion request submitted. You will be notified when processed.',
            data: { request: deletionRequest },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/users/deletion-status
 * Get status of own deletion request
 */
async function getDeletionStatus(req, res, next) {
    try {
        const request = await prisma.accountDeletionRequest.findFirst({
            where: {
                userId: req.user.id,
            },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({
            status: 'success',
            data: { request },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/admin/deletion-requests
 * List all deletion requests (Admin only)
 */
async function listDeletionRequests(req, res, next) {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const where = {};
        if (status) {
            where.status = status;
        }

        const requests = await prisma.accountDeletionRequest.findMany({
            where,
            include: {
                user: { 
                    select: { 
                        id: true, 
                        email: true, 
                        firstName: true, 
                        lastName: true,
                        role: true,
                    } 
                },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
        });

        const total = await prisma.accountDeletionRequest.count({ where });

        return res.status(200).json({
            status: 'success',
            data: {
                requests,
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
 * PUT /api/v1/admin/deletion-requests/:id/approve
 * Approve account deletion request (Admin only)
 */
async function approveDeletionRequest(req, res, next) {
    try {
        const { id } = req.params;

        const request = await prisma.accountDeletionRequest.findUnique({
            where: { id },
            include: { user: true },
        });

        if (!request) {
            return res.status(404).json({
                status: 'error',
                message: 'Deletion request not found.',
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: 'Request is not pending.',
            });
        }

        // Deactivate user account instead of deleting
        await prisma.user.update({
            where: { id: request.userId },
            data: { isActive: false },
        });

        const updated = await prisma.accountDeletionRequest.update({
            where: { id },
            data: {
                status: 'APPROVED',
                processedById: req.user.id,
                processedAt: new Date(),
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ACCOUNT_DELETION_APPROVED',
            entity: 'AccountDeletionRequest',
            entityId: request.id,
            metadata: { userId: request.userId },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Account deletion request approved. User has been deactivated.',
            data: { request: updated },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/admin/deletion-requests/:id/reject
 * Reject account deletion request (Admin only)
 */
async function rejectDeletionRequest(req, res, next) {
    try {
        const { id } = req.params;

        const request = await prisma.accountDeletionRequest.findUnique({
            where: { id },
        });

        if (!request) {
            return res.status(404).json({
                status: 'error',
                message: 'Deletion request not found.',
            });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                status: 'error',
                message: 'Request is not pending.',
            });
        }

        const updated = await prisma.accountDeletionRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                processedById: req.user.id,
                processedAt: new Date(),
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ACCOUNT_DELETION_REJECTED',
            entity: 'AccountDeletionRequest',
            entityId: request.id,
            metadata: { userId: request.userId },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Account deletion request rejected.',
            data: { request: updated },
        });
    } catch (error) {
        next(error);
    }
}

export {
    requestAccountDeletion,
    getDeletionStatus,
    listDeletionRequests,
    approveDeletionRequest,
    rejectDeletionRequest,
};

