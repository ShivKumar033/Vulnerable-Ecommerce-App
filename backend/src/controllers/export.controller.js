const { prisma } = require('../config/db');
const { createAuditLog } = require('../utils/auditLog');

// ──────────────────────────────────────────────────────────────
// Export / Import Controller
// Covers: CSV export/import, Invoice PDF generation
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/export/orders
 * Export orders as CSV.
 */
async function exportOrdersCsv(req, res, next) {
    try {
        const { status, userId } = req.query;

        const where = {};
        if (status) where.status = status;
        if (userId) where.userId = userId;

        const orders = await prisma.order.findMany({
            where,
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
                items: {
                    include: {
                        product: { select: { id: true, title: true } },
                    },
                },
                payment: { select: { status: true, amount: true, paymentMethod: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Build CSV
        // VULNERABLE: CSV Injection — user data (email, names, product titles) is not
        // sanitized before writing to CSV. Excel/Sheets may execute formulas like
        // =CMD() or =HYPERLINK() injected in fields.
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – CSV Injection (via information disclosure)
        const headers = 'Order ID,Order Number,User Email,User Name,Status,Subtotal,Tax,Shipping,Discount,Total,Payment Status,Products,Created At\n';
        const rows = orders.map((o) => {
            const products = o.items.map((i) => `${i.product?.title || 'N/A'} x${i.quantity}`).join('; ');
            const userName = `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim();
            return `${o.id},${o.orderNumber},${o.user?.email || ''},${userName},${o.status},${o.subtotal},${o.tax},${o.shippingCost},${o.discount},${o.totalAmount},${o.payment?.status || 'N/A'},"${products}",${o.createdAt.toISOString()}`;
        }).join('\n');

        const csv = headers + rows;

        await createAuditLog({
            userId: req.user.id,
            action: 'EXPORT_ORDERS_CSV',
            entity: 'Order',
            metadata: { count: orders.length },
            req,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
        return res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/export/users
 * Export users as CSV.
 */
async function exportUsersCsv(req, res, next) {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
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
            },
        });

        // VULNERABLE: CSV Injection — no sanitization
        // Maps to: OWASP A03:2021 – Injection
        const headers = 'User ID,Email,First Name,Last Name,Phone,Role,Email Verified,Active,Created At\n';
        const rows = users.map((u) =>
            `${u.id},${u.email},${u.firstName || ''},${u.lastName || ''},${u.phone || ''},${u.role},${u.isEmailVerified},${u.isActive},${u.createdAt.toISOString()}`
        ).join('\n');

        const csv = headers + rows;

        await createAuditLog({
            userId: req.user.id,
            action: 'EXPORT_USERS_CSV',
            entity: 'User',
            metadata: { count: users.length },
            req,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
        return res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/export/products
 * Export products as CSV.
 */
async function exportProductsCsv(req, res, next) {
    try {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                category: { select: { name: true } },
                vendor: { select: { email: true, firstName: true, lastName: true } },
            },
        });

        const headers = 'Product ID,Title,SKU,Price,Stock,Category,Vendor,Active,Created At\n';
        const rows = products.map((p) =>
            `${p.id},"${p.title}",${p.sku || ''},${p.price},${p.stock},${p.category?.name || ''},${p.vendor?.email || ''},${p.isActive},${p.createdAt.toISOString()}`
        ).join('\n');

        const csv = headers + rows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
        return res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/import/products
 * Import products from CSV data.
 */
async function importProductsCsv(req, res, next) {
    try {
        const { csvData, vendorId } = req.body;

        if (!csvData) {
            return res.status(400).json({ status: 'error', message: 'csvData is required.' });
        }

        // VULNERABLE: No input validation on CSV data — OS command injection possible
        // if processing uses shell commands. Also SQL injection via product data.
        // Maps to: OWASP A03:2021 – Injection
        const lines = csvData.split('\n').filter((l) => l.trim());
        const headers = lines[0].split(',');

        const products = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const product = {};
            headers.forEach((h, idx) => {
                product[h.trim()] = values[idx]?.trim() || '';
            });

            try {
                const created = await prisma.product.create({
                    data: {
                        title: product.title || `Imported Product ${i}`,
                        slug: (product.title || `import-${i}`).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
                        description: product.description || null,
                        price: parseFloat(product.price) || 0,
                        stock: parseInt(product.stock, 10) || 0,
                        sku: product.sku || null,
                        vendorId: vendorId || req.user.id,
                        categoryId: product.categoryId || null,
                        isActive: true,
                    },
                });
                products.push(created);
            } catch (err) {
                products.push({ error: err.message, line: i });
            }
        }

        await createAuditLog({
            userId: req.user.id,
            action: 'IMPORT_PRODUCTS_CSV',
            entity: 'Product',
            metadata: { imported: products.length, rawCsvLength: csvData.length },
            req,
        });

        return res.status(201).json({
            status: 'success',
            message: `${products.filter((p) => !p.error).length} products imported.`,
            data: { products },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/export/invoices/:orderId
 * Generate a mock invoice (JSON/text format) for an order.
 * VULNERABLE: SSRF — if templateUrl is provided, fetches it without validation.
 * Maps to: OWASP A10:2021 – Server-Side Request Forgery
 * PortSwigger – SSRF
 */
async function generateInvoice(req, res, next) {
    try {
        const { orderId } = req.params;
        const { templateUrl } = req.query;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true } },
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

        // VULNERABLE: SSRF — fetching template from user-provided URL
        // Maps to: OWASP A10:2021 – Server-Side Request Forgery
        // PortSwigger – SSRF
        let templateContent = null;
        if (templateUrl) {
            try {
                const http = templateUrl.startsWith('https') ? require('https') : require('http');
                const fetchPromise = new Promise((resolve, reject) => {
                    http.get(templateUrl, (response) => {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks).toString()));
                        response.on('error', reject);
                    }).on('error', reject);
                });
                templateContent = await fetchPromise;
            } catch (fetchErr) {
                // VULNERABLE: Leaking SSRF error details
                return res.status(500).json({
                    status: 'error',
                    message: 'Failed to fetch invoice template.',
                    error: fetchErr.message,
                });
            }
        }

        // Build invoice data
        const invoice = {
            invoiceNumber: `INV-${order.orderNumber}`,
            date: order.createdAt.toISOString(),
            customer: {
                name: `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim(),
                email: order.user?.email || '',
            },
            address: order.address || null,
            items: order.items.map((i) => ({
                product: i.product?.title || 'N/A',
                quantity: i.quantity,
                unitPrice: i.price,
                total: parseFloat(i.price) * i.quantity,
            })),
            subtotal: order.subtotal,
            tax: order.tax,
            shipping: order.shippingCost,
            discount: order.discount,
            total: order.totalAmount,
            paymentStatus: order.payment?.status || 'N/A',
            coupon: order.coupon?.code || null,
            templateContent, // include fetched template if any
        };

        await createAuditLog({
            userId: req.user?.id || null,
            action: 'INVOICE_GENERATED',
            entity: 'Order',
            entityId: orderId,
            req,
        });

        return res.status(200).json({
            status: 'success',
            data: { invoice },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/export/audit-logs
 * Export audit logs as CSV.
 */
async function exportAuditLogsCsv(req, res, next) {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 1000,
            include: {
                user: { select: { email: true } },
            },
        });

        // VULNERABLE: CSV injection — metadata may contain formulas
        // Maps to: OWASP A03:2021 – Injection
        const headers = 'Log ID,User Email,Action,Entity,Entity ID,IP Address,User Agent,Metadata,Created At\n';
        const rows = logs.map((l) =>
            `${l.id},${l.user?.email || 'system'},${l.action},${l.entity || ''},${l.entityId || ''},${l.ipAddress || ''},${l.userAgent || ''},"${JSON.stringify(l.metadata || {})}",${l.createdAt.toISOString()}`
        ).join('\n');

        const csv = headers + rows;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        return res.status(200).send(csv);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    exportOrdersCsv,
    exportUsersCsv,
    exportProductsCsv,
    importProductsCsv,
    generateInvoice,
    exportAuditLogsCsv,
};
