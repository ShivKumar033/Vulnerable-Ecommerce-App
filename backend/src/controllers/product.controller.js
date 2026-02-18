import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import path from 'path';
import http from 'http';
import https from 'https';

// ──────────────────────────────────────────────────────────────
// Product Controller
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/products
 * List products with pagination, filtering, sorting.
 */
async function listProducts(req, res, next) {
    try {
        // VULNERABLE: SQL Injection in search — using raw query for keyword search
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – SQL Injection
        const {
            page = 1,
            limit = 12,
            keyword,
            category,
            minPrice,
            maxPrice,
            rating,
            sortBy = 'createdAt',
            order = 'desc',
        } = req.query;

        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 12;
        const skip = (pageNum - 1) * pageSize;

        // Build filter
        const where = { isActive: true };

        if (category) {
            where.categoryId = category;
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price.gte = parseFloat(minPrice);
            if (maxPrice) where.price.lte = parseFloat(maxPrice);
        }

        // If keyword search is used, we intentionally use raw SQL for vulnerability
        if (keyword) {
            // VULNERABLE: SQL Injection — unsanitized user input interpolated into SQL
            // Maps to: OWASP A03:2021 – Injection
            // PortSwigger – SQL Injection
            try {
                const rawResults = await prisma.$queryRawUnsafe(
                    `SELECT id, title, slug, description, price, stock, "vendorId", "categoryId", "isActive", "createdAt"
                     FROM products
                     WHERE "isActive" = true
                       AND (title ILIKE '%${keyword}%' OR description ILIKE '%${keyword}%')
                     ORDER BY "${sortBy}" ${order}
                     LIMIT ${pageSize} OFFSET ${skip}`
                );

                const countResult = await prisma.$queryRawUnsafe(
                    `SELECT COUNT(*) as count FROM products
                     WHERE "isActive" = true
                       AND (title ILIKE '%${keyword}%' OR description ILIKE '%${keyword}%')`
                );

                const totalCount = parseInt(countResult[0]?.count || '0', 10);

                return res.status(200).json({
                    status: 'success',
                    data: {
                        products: rawResults,
                        pagination: {
                            page: pageNum,
                            limit: pageSize,
                            totalCount,
                            totalPages: Math.ceil(totalCount / pageSize),
                        },
                    },
                });
            } catch (sqlErr) {
                // VULNERABLE: SQL error messages exposed to client
                // Maps to: PortSwigger – Information Disclosure
                return res.status(500).json({
                    status: 'error',
                    message: 'Search query failed.',
                    error: sqlErr.message,
                    query: keyword, // leaks the input back
                });
            }
        }

        // Standard Prisma query (no keyword)
        const orderBy = {};
        orderBy[sortBy] = order;

        const [products, totalCount] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: pageSize,
                orderBy,
                include: {
                    images: { select: { id: true, url: true, altText: true, isPrimary: true } },
                    category: { select: { id: true, name: true, slug: true } },
                    vendor: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { reviews: true } },
                },
            }),
            prisma.product.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                products,
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

/**
 * GET /api/v1/products/:id
 * Get a single product by ID.
 */
async function getProduct(req, res, next) {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                images: true,
                variants: true,
                category: true,
                vendor: {
                    // VULNERABLE: Excessive data exposure — leaking vendor details
                    // Maps to: OWASP API3:2019 – Excessive Data Exposure
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        createdAt: true,
                    },
                },
                reviews: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found.',
            });
        }

        // Compute average rating
        const avgRating =
            product.reviews.length > 0
                ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
                : 0;

        return res.status(200).json({
            status: 'success',
            data: {
                product: {
                    ...product,
                    averageRating: Math.round(avgRating * 10) / 10,
                    reviewCount: product.reviews.length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/products
 * Create a new product. Vendor/Admin only.
 */
async function createProduct(req, res, next) {
    try {
        const {
            title,
            slug,
            description,
            price,
            comparePrice,
            stock,
            sku,
            categoryId,
            isActive,
            variants,
        } = req.body;

        if (!title || !price) {
            return res.status(400).json({
                status: 'error',
                message: 'Title and price are required.',
            });
        }

        // Generate slug if not provided
        const productSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // VULNERABLE: No validation that the vendorId is the authenticated user.
        // An attacker can create products under another vendor's account.
        // Maps to: OWASP A01:2021 – Broken Access Control
        const vendorId = req.body.vendorId || req.user.id;

        const product = await prisma.product.create({
            data: {
                title,
                slug: productSlug + '-' + Date.now(),
                description: description || null,
                price: parseFloat(price),
                comparePrice: comparePrice ? parseFloat(comparePrice) : null,
                stock: parseInt(stock, 10) || 0,
                sku: sku || null,
                vendorId,
                categoryId: categoryId || null,
                isActive: isActive !== undefined ? isActive : true,
                variants: variants
                    ? {
                        create: variants.map((v) => ({
                            name: v.name,
                            value: v.value,
                            price: v.price ? parseFloat(v.price) : null,
                            stock: parseInt(v.stock, 10) || 0,
                            sku: v.sku || null,
                        })),
                    }
                    : undefined,
            },
            include: {
                variants: true,
                category: true,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'PRODUCT_CREATED',
            entity: 'Product',
            entityId: product.id,
            metadata: { title, price, vendorId },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: 'Product created successfully.',
            data: { product },
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({
                status: 'error',
                message: 'A product with this slug or SKU already exists.',
            });
        }
        next(error);
    }
}

/**
 * PUT /api/v1/products/:id
 * Update a product. Vendor owner or Admin only.
 */
async function updateProduct(req, res, next) {
    try {
        const { id } = req.params;

        // Fetch existing product
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found.',
            });
        }

        // VULNERABLE: Missing ownership check for vendors — any authenticated
        // vendor can update any product, not just their own.
        // Maps to: OWASP A01:2021 – Broken Access Control (IDOR)
        // PortSwigger – Access Control Vulnerabilities
        // (Only admins and the actual vendor owner should be allowed)

        const {
            title,
            description,
            price,
            comparePrice,
            stock,
            sku,
            categoryId,
            isActive,
        } = req.body;

        const product = await prisma.product.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(price !== undefined && { price: parseFloat(price) }),
                ...(comparePrice !== undefined && { comparePrice: parseFloat(comparePrice) }),
                ...(stock !== undefined && { stock: parseInt(stock, 10) }),
                ...(sku !== undefined && { sku }),
                ...(categoryId !== undefined && { categoryId }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                images: true,
                variants: true,
                category: true,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'PRODUCT_UPDATED',
            entity: 'Product',
            entityId: product.id,
            metadata: { changes: req.body },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Product updated successfully.',
            data: { product },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/products/:id
 * Delete a product. Admin or Vendor owner.
 */
async function deleteProduct(req, res, next) {
    try {
        const { id } = req.params;

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found.',
            });
        }

        // VULNERABLE: No ownership check — any vendor can delete any product
        // Maps to: OWASP A01:2021 – Broken Access Control (IDOR)

        await prisma.product.delete({ where: { id } });

        await createAuditLog({
            userId: req.user.id,
            action: 'PRODUCT_DELETED',
            entity: 'Product',
            entityId: id,
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Product deleted successfully.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/products/:id/images
 * Upload images for a product.
 */
async function uploadProductImages(req, res, next) {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found.',
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'No files uploaded.',
            });
        }

        // VULNERABLE: Unrestricted file upload — no MIME/extension validation.
        // Files are saved and served from /public/uploads.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – File Upload Vulnerabilities
        const images = await Promise.all(
            req.files.map((file, index) =>
                prisma.productImage.create({
                    data: {
                        url: `/public/uploads/${file.filename}`,
                        altText: file.originalname,
                        isPrimary: index === 0,
                        productId: id,
                    },
                })
            )
        );

        return res.status(201).json({
            status: 'success',
            message: `${images.length} image(s) uploaded.`,
            data: { images },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/products/:id/images/url
 * Fetch a product image from a remote URL (SSRF-vulnerable endpoint).
 */
async function fetchProductImageFromUrl(req, res, next) {
    try {
        const { id } = req.params;
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({
                status: 'error',
                message: 'imageUrl is required.',
            });
        }

        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found.',
            });
        }

        // VULNERABLE: SSRF — fetches any URL without validation.
        // Attacker can supply internal URLs (http://169.254.169.254, http://localhost:6379, etc.)
        // Maps to: OWASP A10:2021 – Server-Side Request Forgery
        // PortSwigger – SSRF
        const validHttp = imageUrl.startsWith('https') ? https : http;

        const fetchPromise = new Promise((resolve, reject) => {
            validHttp.get(imageUrl, (response) => {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    resolve({
                        data: Buffer.concat(chunks),
                        contentType: response.headers['content-type'],
                        statusCode: response.statusCode,
                    });
                });
                response.on('error', reject);
            }).on('error', reject);
        });

        const result = await fetchPromise;

        // Save to DB as external URL
        const image = await prisma.productImage.create({
            data: {
                url: imageUrl, // storing the remote URL directly
                altText: 'Remote image',
                isPrimary: false,
                productId: id,
            },
        });

        return res.status(201).json({
            status: 'success',
            message: 'Image fetched and linked.',
            data: {
                image,
                fetchedContentType: result.contentType,
                fetchedStatus: result.statusCode,
                // VULNERABLE: Returning fetched data info to the attacker (SSRF oracle)
                fetchedSize: result.data.length,
            },
        });
    } catch (error) {
        // VULNERABLE: Leaking internal error messages from SSRF attempts
        return res.status(500).json({
            status: 'error',
            message: 'Failed to fetch image from URL.',
            error: error.message,
        });
    }
}

export {
    listProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImages,
    fetchProductImageFromUrl,
};
