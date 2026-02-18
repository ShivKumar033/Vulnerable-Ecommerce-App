import { Router } from 'express';
import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

const router = Router();

// ──────────────────────────────────────────────────────────────
// Legacy API v2 Routes
// ──────────────────────────────────────────────────────────────
// These are "old" API endpoints that were never properly secured
// or deprecated. They exist to simulate legacy attack surface.
// VULNERABLE: No authentication/authorization on most endpoints
// Maps to: OWASP A01:2021 – Broken Access Control
// Maps to: OWASP A05:2021 – Security Misconfiguration
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v2/users
 * VULNERABLE: No authentication — lists all users with full data
 * Maps to: OWASP A01:2021 – Broken Access Control
 * Maps to: OWASP API3:2019 – Excessive Data Exposure
 */
router.get('/users', async (req, res, next) => {
    try {
        const users = await prisma.user.findMany({
            // VULNERABLE: Returns ALL fields including password hashes
            // Maps to: OWASP A03:2021 – Injection
            // PortSwigger – Information Disclosure
        });

        return res.status(200).json({
            status: 'success',
            data: { users },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v2/users/:id
 * VULNERABLE: No authentication, returns full user object with password hash
 * Maps to: OWASP A01:2021 – Broken Access Control
 */
router.get('/users/:id', async (req, res, next) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
            include: {
                addresses: true,
                orders: true,
                refreshTokens: true, // VULNERABLE: Exposing refresh tokens
                savedPayments: true,
                auditLogs: true,
            },
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        return res.status(200).json({ status: 'success', data: { user } });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v2/orders
 * VULNERABLE: No authentication — lists all orders
 * Maps to: OWASP A01:2021 – Broken Access Control
 */
router.get('/orders', async (req, res, next) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                user: true,
                items: { include: { product: true } },
                payment: true,
                address: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return res.status(200).json({ status: 'success', data: { orders } });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/v2/users/:id
 * VULNERABLE: No authentication — allows updating any user's data including role
 * Maps to: OWASP A01:2021 – Broken Access Control
 * PortSwigger – Access Control Vulnerabilities
 */
router.put('/users/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        // VULNERABLE: Mass assignment — accepts any field from body
        const user = await prisma.user.update({
            where: { id },
            data: req.body,
        });

        return res.status(200).json({ status: 'success', data: { user } });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v2/products/:id
 * VULNERABLE: Returns internal product data including vendor details
 */
router.get('/products/:id', async (req, res, next) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
            include: {
                vendor: true, // VULNERABLE: Exposes full vendor details
                category: true,
                reviews: { include: { user: true } }, // Exposes reviewer details
                variants: true,
                images: true,
            },
        });

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found.' });
        }

        return res.status(200).json({ status: 'success', data: { product } });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v2/config
 * VULNERABLE: Exposes server configuration and environment variables
 * Maps to: OWASP A05:2021 – Security Misconfiguration
 * PortSwigger – Information Disclosure
 */
router.get('/config', async (req, res, next) => {
    try {
        // VULNERABLE: Leaking environment configuration
        return res.status(200).json({
            status: 'success',
            data: {
                config: {
                    nodeEnv: process.env.NODE_ENV,
                    databaseUrl: process.env.DATABASE_URL, // CRITICAL: leaking DB credentials
                    jwtSecret: process.env.JWT_SECRET, // CRITICAL: leaking JWT secret
                    webhookSecret: process.env.WEBHOOK_SECRET,
                    googleClientId: process.env.GOOGLE_CLIENT_ID,
                    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET, // CRITICAL
                    smtpHost: process.env.SMTP_HOST,
                    smtpPort: process.env.SMTP_PORT,
                    smtpUser: process.env.SMTP_USER,
                    smtpPass: process.env.SMTP_PASS,
                    frontendUrl: process.env.FRONTEND_URL,
                    uploadDir: process.env.UPLOAD_DIR,
                    serverTime: new Date().toISOString(),
                    uptime: process.uptime(),
                    memoryUsage: process.memoryUsage(),
                    nodeVersion: process.version,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/v2/debug/sql
 * VULNERABLE: Direct SQL query endpoint — SQL injection playground
 * Maps to: OWASP A03:2021 – Injection
 * PortSwigger – SQL Injection
 */
router.get('/debug/sql', async (req, res, next) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({
                status: 'error',
                message: 'query parameter is required.',
            });
        }

        // VULNERABLE: Direct SQL query execution — ultimate SQL injection
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – SQL Injection
        const result = await prisma.$queryRawUnsafe(query);

        return res.status(200).json({
            status: 'success',
            data: { result },
        });
    } catch (error) {
        // VULNERABLE: Leaking SQL error details
        return res.status(500).json({
            status: 'error',
            message: 'SQL query failed.',
            error: error.message,
            query,
        });
    }
});

/**
 * POST /api/v2/debug/eval
 * VULNERABLE: Code injection via eval()
 * Maps to: OWASP A03:2021 – Injection
 * PortSwigger – Server-side code injection (Node.js)
 */
router.post('/debug/eval', async (req, res, next) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ status: 'error', message: 'code is required.' });
        }

        // VULNERABLE: Arbitrary code execution via eval
        // Maps to: OWASP A03:2021 – Injection
        // eslint-disable-next-line no-eval
        const result = eval(code);

        return res.status(200).json({
            status: 'success',
            data: { result: String(result) },
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Code execution failed.',
            error: error.message,
        });
    }
});

export default router;
