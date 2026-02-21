import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import PDFDocument from 'pdfkit';
import http from 'http';
import https from 'https';

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
 * 
 * Also VULNERABLE: SQL injection — filter parameter uses raw SQL
 * Maps to: OWASP A03:2021 – Injection
 */
async function generateInvoice(req, res, next) {
    try {
        const { orderId } = req.params;
        const { templateUrl, filter } = req.query;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        let query = `
            SELECT o.*, u.email as user_email, u."firstName" as user_firstname, u."lastName" as user_lastname
            FROM "Order" o
            LEFT JOIN "User" u ON o."userId" = u.id
            WHERE o.id = $1
        `;
        
        const queryParams = [orderId];
        
        // VULNERABLE: SQL injection — filter parameter is used in raw query
        // Attacker can inject SQL via filter query parameter
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – SQL Injection
        if (filter) {
            // Append filter condition without sanitization
            query += ` AND (${filter})`;
        }

        const order = await prisma.$queryRawUnsafe(query, ...queryParams);
        
        if (!order || order.length === 0 || !order[0]) {
            return res.status(404).json({ status: 'error', message: 'Order not found.' });
        }

        const orderData = order[0];

        // Fetch related data
        const orderItems = await prisma.orderItem.findMany({
            where: { orderId: orderData.id },
            include: { product: { select: { id: true, title: true, price: true } } },
        });

        const address = orderData.addressId ? await prisma.address.findUnique({
            where: { id: orderData.addressId },
        }) : null;

        const payment = await prisma.payment.findFirst({
            where: { orderId: orderData.id },
        });

        const coupon = orderData.couponId ? await prisma.coupon.findUnique({
            where: { id: orderData.couponId },
        }) : null;

        // VULNERABLE: SSRF — fetching template from user-provided URL
        // Maps to: OWASP A10:2021 – Server-Side Request Forgery
        // PortSwigger – SSRF
        let templateContent = null;
        if (templateUrl) {
            try {
                const sender = templateUrl.startsWith('https') ? https : http;
                const fetchPromise = new Promise((resolve, reject) => {
                    sender.get(templateUrl, (response) => {
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
            invoiceNumber: `INV-${orderData.orderNumber}`,
            date: orderData.createdAt,
            customer: {
                name: `${orderData.user_firstname || ''} ${orderData.user_lastname || ''}`.trim(),
                email: orderData.user_email || '',
            },
            address: address || null,
            items: orderItems.map((i) => ({
                product: i.product?.title || 'N/A',
                quantity: i.quantity,
                unitPrice: i.price,
                total: parseFloat(i.price) * i.quantity,
            })),
            subtotal: orderData.subtotal,
            tax: orderData.tax,
            shipping: orderData.shippingCost,
            discount: orderData.discount,
            total: orderData.totalAmount,
            paymentStatus: payment?.status || 'N/A',
            coupon: coupon?.code || null,
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
        // VULNERABLE: Exposing SQL error details to client
        return res.status(500).json({
            status: 'error',
            message: 'Failed to generate invoice.',
            error: error.message,
            query: req.query.filter, // leaks the injection input back
        });
    }
}

/**
 * GET /api/v1/export/invoices/:orderId/pdf
 * Generate a real PDF invoice for an order using PDFKit.
 *
 * VULNERABLE: IDOR — no ownership check (any authenticated user can
 * download any order's invoice).
 * Maps to: OWASP A01:2021 – Broken Access Control
 */
async function generateInvoicePdf(req, res, next) {
    try {
        const { orderId } = req.params;

        // VULNERABLE: IDOR — no ownership check
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

        // Create PDF document
        const doc = new PDFDocument({ margin: 50 });

// Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="invoice-${order.orderNumber}.pdf"`
        );

        // Pipe directly to response
        doc.pipe(res);

        // VULNERABLE: SSRF — allow fetching logo from remote URL
        // This enables attackers to access internal services via the invoice generation
        // Maps to: OWASP A10:2021 – Server-Side Request Forgery
        // PortSwigger – SSRF
        const logoUrl = req.query.logoUrl;
        if (logoUrl) {
            try {
                const validHttp = logoUrl.startsWith('https') ? https : http;
                const imgPromise = new Promise((resolve, reject) => {
                    validHttp.get(logoUrl, (response) => {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => resolve(Buffer.concat(chunks)));
                        response.on('error', reject);
                    }).on('error', reject);
                });
                const imgBuffer = await imgPromise;
                doc.image(imgBuffer, 50, 20, { width: 100 });
            } catch (err) {
                // Ignore logo fetch errors, continue without logo
            }
        }

        // ── Header ──────────────────────────────────────
        doc
            .fontSize(24)
            .text('INVOICE', { align: 'center' })
            .moveDown(0.5);

        doc
            .fontSize(10)
            .fillColor('#666')
            .text('Vulnerable E-Commerce Platform', { align: 'center' })
            .text('For Security Testing Purposes Only', { align: 'center' })
            .moveDown(1);

        // ── Invoice metadata ────────────────────────────
        doc
            .fillColor('#000')
            .fontSize(12)
            .text(`Invoice #: INV-${order.orderNumber}`)
            .text(`Date: ${order.createdAt.toISOString().split('T')[0]}`)
            .text(`Order #: ${order.orderNumber}`)
            .text(`Status: ${order.status}`)
            .moveDown(1);

        // ── Customer info ───────────────────────────────
        const customerName = `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'N/A';
        doc
            .fontSize(12)
            .text('Bill To:', { underline: true })
            .fontSize(10)
            .text(customerName)
            .text(order.user?.email || '');

        if (order.address) {
            doc
                .text(order.address.street || '')
                .text(
                    `${order.address.city || ''}, ${order.address.state || ''} ${order.address.zipCode || ''}`
                )
                .text(order.address.country || '');
        }
        doc.moveDown(1);

        // ── Items table ─────────────────────────────────
        doc
            .fontSize(12)
            .text('Items:', { underline: true })
            .moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        const col1 = 50;   // Product
        const col2 = 280;  // Qty
        const col3 = 340;  // Unit Price
        const col4 = 430;  // Total

        doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .text('Product', col1, tableTop)
            .text('Qty', col2, tableTop)
            .text('Unit Price', col3, tableTop)
            .text('Total', col4, tableTop);

        doc
            .moveTo(col1, tableTop + 14)
            .lineTo(530, tableTop + 14)
            .stroke();

        // Table rows
        let y = tableTop + 20;
        doc.font('Helvetica');

        for (const item of order.items) {
            const productTitle = item.product?.title || 'N/A';
            const unitPrice = parseFloat(item.price);
            const lineTotal = unitPrice * item.quantity;

            doc
                .fontSize(9)
                .text(productTitle.substring(0, 40), col1, y, { width: 220 })
                .text(String(item.quantity), col2, y)
                .text(`$${unitPrice.toFixed(2)}`, col3, y)
                .text(`$${lineTotal.toFixed(2)}`, col4, y);

            y += 18;

            // Add a new page if needed
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        }

        // Separator
        doc
            .moveTo(col1, y + 5)
            .lineTo(530, y + 5)
            .stroke();
        y += 15;

        // ── Totals ──────────────────────────────────────
        const totals = [
            ['Subtotal', order.subtotal],
            ['Tax', order.tax],
            ['Shipping', order.shippingCost],
            ['Discount', order.discount ? `-${order.discount}` : '0.00'],
        ];

        for (const [label, value] of totals) {
            doc
                .fontSize(10)
                .text(label, col3, y)
                .text(`$${parseFloat(value).toFixed(2)}`, col4, y);
            y += 16;
        }

        y += 5;
        doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .text('TOTAL', col3, y)
            .text(`$${parseFloat(order.totalAmount).toFixed(2)}`, col4, y);

        doc.font('Helvetica');
        y += 25;

        // ── Payment info ────────────────────────────────
        if (order.payment) {
            doc
                .fontSize(10)
                .text(`Payment Status: ${order.payment.status}`, col1, y)
                .text(`Payment Method: ${order.payment.paymentMethod || 'N/A'}`, col1, y + 14);
            y += 35;
        }

        if (order.coupon) {
            doc.text(`Coupon Applied: ${order.coupon.code}`, col1, y);
            y += 20;
        }

        // ── Footer ──────────────────────────────────────
        doc
            .moveDown(3)
            .fontSize(8)
            .fillColor('#999')
            .text('This invoice was generated automatically.', col1, 750, { align: 'center' })
            .text('Vulnerable E-Commerce Platform — Security Testing Only', { align: 'center' });

        // Finalize PDF
        doc.end();

        await createAuditLog({
            userId: req.user?.id || null,
            action: 'INVOICE_PDF_GENERATED',
            entity: 'Order',
            entityId: orderId,
            req,
        });

        // Note: response is streamed via doc.pipe(res), no explicit return needed
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

export {
    exportOrdersCsv,
    exportUsersCsv,
    exportProductsCsv,
    importProductsCsv,
    generateInvoice,
    generateInvoicePdf,
    exportAuditLogsCsv,
};
