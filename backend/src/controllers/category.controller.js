import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Category Controller
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/categories
 * List all categories with hierarchy.
 */
async function listCategories(req, res, next) {
    try {
        const categories = await prisma.category.findMany({
            where: { parentId: null },
            include: {
                children: {
                    include: {
                        children: true, // supports 2 levels of nesting
                        _count: { select: { products: true } },
                    },
                },
                _count: { select: { products: true } },
            },
            orderBy: { name: 'asc' },
        });

        return res.status(200).json({
            status: 'success',
            data: { categories },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/categories/:id
 * Get a single category with its products.
 */
async function getCategory(req, res, next) {
    try {
        const { id } = req.params;

        const category = await prisma.category.findUnique({
            where: { id },
            include: {
                parent: { select: { id: true, name: true, slug: true } },
                children: {
                    select: { id: true, name: true, slug: true },
                },
                products: {
                    where: { isActive: true },
                    take: 20,
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        price: true,
                        stock: true,
                        images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                    },
                },
            },
        });

        if (!category) {
            return res.status(404).json({ status: 'error', message: 'Category not found.' });
        }

        return res.status(200).json({
            status: 'success',
            data: { category },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/categories
 * Create a category. Admin only.
 */
async function createCategory(req, res, next) {
    try {
        const { name, slug, parentId } = req.body;

        if (!name) {
            return res.status(400).json({ status: 'error', message: 'name is required.' });
        }

        const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const category = await prisma.category.create({
            data: {
                name,
                slug: catSlug,
                parentId: parentId || null,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'CATEGORY_CREATED',
            entity: 'Category',
            entityId: category.id,
            metadata: { name, slug: catSlug, parentId },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Category created.',
            data: { category },
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                status: 'error',
                message: 'A category with this slug already exists.',
            });
        }
        next(error);
    }
}

/**
 * PUT /api/v1/categories/:id
 * Update a category. Admin only.
 */
async function updateCategory(req, res, next) {
    try {
        const { id } = req.params;
        const { name, slug, parentId } = req.body;

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Category not found.' });
        }

        const category = await prisma.category.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(parentId !== undefined && { parentId }),
            },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Category updated.',
            data: { category },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/categories/:id
 * Delete a category. Admin only.
 */
async function deleteCategory(req, res, next) {
    try {
        const { id } = req.params;

        const existing = await prisma.category.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Category not found.' });
        }

        await prisma.category.delete({ where: { id } });

        await createAuditLog({
            userId: req.user.id,
            action: 'CATEGORY_DELETED',
            entity: 'Category',
            entityId: id,
            req,
        });

        return res.status(200).json({ status: 'success', message: 'Category deleted.' });
    } catch (error) {
        next(error);
    }
}

export {
    listCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
};
