import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Database client (connection established in server.js)
import { prisma } from './config/db.js';

const app = express();

// Make prisma available on the app for route handlers
app.set('prisma', prisma);

// ---------------------------------------------------------------------------
// Middleware Setup
// ---------------------------------------------------------------------------

// VULNERABLE: CORS misconfiguration – allows any origin with credentials.
// This lets an attacker's website make authenticated requests on behalf of
// a logged-in user when cookies are used for authentication.
// Maps to: OWASP A05:2021 – Security Misconfiguration
// PortSwigger – Cross-Origin Resource Sharing (CORS) misconfiguration
app.use(cors({
    origin: true,                 // reflects any origin
    credentials: true,            // allows cookies / auth headers
}));

// VULNERABLE: Debug mode / excessive information disclosure.
// Helmet is intentionally configured with many protections DISABLED so that
// the app leaks security headers, allows clickjacking, etc.
// Maps to: OWASP A05:2021 – Security Misconfiguration
// PortSwigger – Clickjacking, Information Disclosure
app.use(helmet({
    contentSecurityPolicy: false,   // no CSP
    frameguard: false,              // allows framing → clickjacking
    hsts: false,                    // no HSTS
    xDownloadOptions: false,
    xXssProtection: false,          // no X-XSS-Protection header
}));

// Request logging – intentionally verbose in all environments
app.use(morgan('dev'));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// VULNERABLE: Publicly accessible static files directory.
// Any file placed in /public is served without authentication.
// Maps to: OWASP A01:2021 – Broken Access Control
// PortSwigger – Information Disclosure
app.use('/public', express.static(path.join(__dirname, '../public')));

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        // VULNERABLE: Information Disclosure – exposing environment details
        // Maps to: OWASP A05:2021 – Security Misconfiguration
        // PortSwigger – Information Disclosure
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        uptime: process.uptime(),
    });
});

// ---------------------------------------------------------------------------
// API Routes — Core Backend Logic
// ---------------------------------------------------------------------------

// Phase 3: Core features
app.use('/api/v1/auth', (await import('./routes/auth.routes.js')).default);
app.use('/api/v1/products', (await import('./routes/product.routes.js')).default);
app.use('/api/v1/cart', (await import('./routes/cart.routes.js')).default);
app.use('/api/v1/orders', (await import('./routes/order.routes.js')).default);
app.use('/api/v1/payments', (await import('./routes/payment.routes.js')).default);

// Phase 4: User account management, categories, reviews
app.use('/api/v1/users', (await import('./routes/user.routes.js')).default);
app.use('/api/v1/categories', (await import('./routes/category.routes.js')).default);
app.use('/api/v1/reviews', (await import('./routes/review.routes.js')).default);

// Phase 5: Admin, support, webhooks, export/import, wallet
app.use('/api/v1/admin', (await import('./routes/admin.routes.js')).default);
app.use('/api/v1/support', (await import('./routes/support.routes.js')).default);
app.use('/api/v1/webhooks', (await import('./routes/webhook.routes.js')).default);
app.use('/api/v1/export', (await import('./routes/export.routes.js')).default);
app.use('/api/v1/import', (await import('./routes/import.routes.js')).default);
app.use('/api/v1/wallet', (await import('./routes/wallet.routes.js')).default);

// VULNERABLE: Legacy API v2 — no authentication on most endpoints
// Maps to: OWASP A01:2021 – Broken Access Control
// Maps to: OWASP A05:2021 – Security Misconfiguration
app.use('/api/v2', (await import('./routes/legacy.routes.js')).default);

// ---------------------------------------------------------------------------
// 404 Handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
    });
});

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------
// VULNERABLE: Verbose error responses leak stack traces in all environments.
// Maps to: OWASP A05:2021 – Security Misconfiguration
// PortSwigger – Information Disclosure
app.use((err, req, res, _next) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
        status: 'error',
        message: err.message,
        // Stack trace exposed to client – information disclosure
        stack: err.stack,
    });
});

export default app;
