const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Database client (connection established in server.js)
const { prisma } = require('./config/db');

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
// API Routes (will be added in later phases)
// ---------------------------------------------------------------------------
// app.use('/api/v1/auth', require('./routes/auth.routes'));
// app.use('/api/v1/users', require('./routes/user.routes'));
// app.use('/api/v1/products', require('./routes/product.routes'));
// app.use('/api/v1/cart', require('./routes/cart.routes'));
// app.use('/api/v1/orders', require('./routes/order.routes'));
// app.use('/api/v1/payments', require('./routes/payment.routes'));
// app.use('/api/v1/admin', require('./routes/admin.routes'));

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

module.exports = app;
