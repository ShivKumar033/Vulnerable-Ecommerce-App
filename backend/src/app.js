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

// CORS configuration with proper headers for Referrer Policy and cross-origin requests
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // In production, you should replace this with specific allowed origins
        const allowedOrigins = [
            'http://localhost:5000',
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:5000',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001'
        ];
        
        // Allow requests with no origin (same-origin requests)
        if (!origin) {
            return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // For development, allow all origins (remove in production)
        return callback(null, true);
    },
    credentials: true,            // allows cookies / auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
}));

// Helmet configuration with security headers
// Note: Some protections are intentionally disabled for this vulnerable demo app
app.use(helmet({
    contentSecurityPolicy: false,   // no CSP
    frameguard: false,              // allows framing → clickjacking
    hsts: false,                    // no HSTS
    xDownloadOptions: false,
    xXssProtection: false,          // no X-XSS-Protection header
    referrerPolicy: {               // Referrer Policy header
        policy: 'strict-origin-when-cross-origin'
    }
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
app.use('/api/v1/vendor', (await import('./routes/vendor.routes.js')).default);
app.use('/api/v1/webhooks', (await import('./routes/webhook.routes.js')).default);
app.use('/api/v1/export', (await import('./routes/export.routes.js')).default);
app.use('/api/v1/import', (await import('./routes/import.routes.js')).default);
app.use('/api/v1/wallet', (await import('./routes/wallet.routes.js')).default);

// Phase 6: User Account Management - New features
app.use('/api/v1/loyalty', (await import('./routes/loyalty.routes.js')).default);
app.use('/api/v1/giftcards', (await import('./routes/giftcard.routes.js')).default);
app.use('/api/v1/returns', (await import('./routes/return.routes.js')).default);
app.use('/api/v1', (await import('./routes/accountDeletion.routes.js')).default);

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
