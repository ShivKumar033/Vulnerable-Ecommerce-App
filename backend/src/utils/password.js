const bcrypt = require('bcryptjs');

// ──────────────────────────────────────────────────────────────
// Password Utilities
// ──────────────────────────────────────────────────────────────

// VULNERABLE: Low salt rounds (8 instead of 12+) — makes brute-forcing faster
// Maps to: OWASP A02:2021 – Cryptographic Failures
const SALT_ROUNDS = 8;

/**
 * Hash a plaintext password using bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>} hashed password
 */
async function hashPassword(plainPassword) {
    return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = { hashPassword, comparePassword };
