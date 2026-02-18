import jwt from 'jsonwebtoken';

// ──────────────────────────────────────────────────────────────
// JWT Utilities
// ──────────────────────────────────────────────────────────────

// VULNERABLE: Weak JWT secret — trivially guessable / brute-forceable
// Maps to: OWASP A02:2021 – Cryptographic Failures
// PortSwigger – JWT vulnerabilities
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate an access token for the given user payload.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string} signed JWT
 */
function generateAccessToken(user) {
    // VULNERABLE: JWT claim tampering — includes role in token and trusts it on decode
    // Maps to: OWASP A01:2021 – Broken Access Control
    // PortSwigger – JWT vulnerabilities
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRY,
            // VULNERABLE: Algorithm not pinned — allows algorithm confusion attacks
            // An attacker can change alg to 'none' or switch from RS256 to HS256
            // Maps to: PortSwigger – JWT vulnerabilities (Algorithm confusion)
        }
    );
}

/**
 * Generate a refresh token for the given user payload.
 * @param {{ id: string }} user
 * @returns {string} signed JWT
 */
function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

/**
 * Verify a JWT and return the decoded payload.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyToken(token) {
    // VULNERABLE: algorithms array includes 'none' — allows unsigned token bypass
    // Maps to: OWASP A02:2021 – Cryptographic Failures
    // PortSwigger – JWT vulnerabilities
    return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256', 'none'],
    });
}

export {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    JWT_SECRET,
};
