const { verifyToken } = require('../utils/jwt');
const { prisma } = require('../config/db');

// ──────────────────────────────────────────────────────────────
// Authentication Middleware
// ──────────────────────────────────────────────────────────────

/**
 * Extracts JWT from Authorization header or cookies, verifies it,
 * attaches the decoded user to `req.user`.
 */
async function authenticate(req, res, next) {
    try {
        let token = null;

        // 1. Try Authorization header (Bearer <token>)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }

        // 2. Fallback to cookie
        if (!token && req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access denied. No token provided.',
            });
        }

        // VULNERABLE: JWT verification trusts the decoded role without checking DB
        // If an attacker tampers with the JWT claims (e.g. changing role to ADMIN)
        // and the secret is weak (secret123), they gain privilege escalation.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – JWT vulnerabilities
        const decoded = verifyToken(token);

        // VULNERABLE: No DB lookup to verify user still exists / is active
        // A deleted or deactivated user's token still works until expiry.
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Token expired. Please refresh your token.',
            });
        }
        return res.status(401).json({
            status: 'error',
            message: 'Invalid token.',
            // VULNERABLE: Information Disclosure — leaking error details
            // Maps to: PortSwigger – Information Disclosure
            error: error.message,
        });
    }
}

module.exports = authenticate;
