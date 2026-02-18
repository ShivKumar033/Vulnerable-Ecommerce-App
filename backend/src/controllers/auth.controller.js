import { prisma } from '../config/db.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyToken } from '../utils/jwt.js';
import { createAuditLog } from '../utils/auditLog.js';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Auth Controller
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Create a new user account.
 */
async function register(req, res, next) {
    try {
        const { email, password, firstName, lastName, phone, role } = req.body;

        // Basic validation
        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required.',
            });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            // VULNERABLE: Account enumeration — reveals that the email is registered
            // Maps to: OWASP A07:2021 – Identification and Authentication Failures
            // PortSwigger – Authentication vulnerabilities (username enumeration)
            return res.status(409).json({
                status: 'error',
                message: 'An account with this email already exists.',
            });
        }

        const hashedPw = await hashPassword(password);

        // VULNERABLE: Mass assignment — client can send `role` in the request body
        // and it will be written directly to the database, allowing privilege escalation.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPw,
                firstName: firstName || null,
                lastName: lastName || null,
                phone: phone || null,
                role: role || 'USER', // attacker can set role to ADMIN
            },
        });

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token in DB
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt,
            },
        });

        // Set cookies
        // VULNERABLE: Cookie missing HttpOnly, Secure flags when not in production
        // Maps to: OWASP A05:2021 – Security Misconfiguration
        res.cookie('accessToken', accessToken, {
            httpOnly: false,    // accessible to JavaScript
            secure: false,      // sent over HTTP too
            sameSite: 'none',   // CSRF-friendly
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'REGISTER',
            entity: 'User',
            entityId: user.id,
            // VULNERABLE: Logging the full request body (including password!)
            metadata: { body: req.body },
            req,
        });

        // VULNERABLE: Excessive Data Exposure — returning full user object
        // Maps to: OWASP A03:2021 – Injection / API3:2019 – Excessive Data Exposure
        return res.status(201).json({
            status: 'success',
            message: 'User registered successfully.',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    createdAt: user.createdAt,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/auth/login
 * Verify credentials and issue JWT tokens.
 */
async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required.',
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            // VULNERABLE: Account enumeration — different message for non-existent user
            // Maps to: OWASP A07:2021 – Identification and Authentication Failures
            // PortSwigger – Authentication vulnerabilities
            return res.status(401).json({
                status: 'error',
                message: 'No account found with this email.',
            });
        }

        if (!user.password) {
            return res.status(401).json({
                status: 'error',
                message: 'This account uses OAuth. Please log in with your connected provider.',
            });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            // VULNERABLE: Different error message for wrong password vs non-existent email
            // Maps to: PortSwigger – Authentication vulnerabilities
            return res.status(401).json({
                status: 'error',
                message: 'Incorrect password.',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                status: 'error',
                message: 'Account is deactivated. Contact support.',
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token — VULNERABLE: old tokens are NOT invalidated
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt,
            },
        });

        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'none',
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Audit log
        await createAuditLog({
            userId: user.id,
            action: 'LOGIN',
            entity: 'User',
            entityId: user.id,
            metadata: { email: user.email, role: user.role },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Login successful.',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                },
                accessToken,
                refreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/auth/refresh-token
 * Re-issue access + refresh tokens from a valid refresh token.
 */
async function refreshTokenHandler(req, res, next) {
    try {
        const { refreshToken: incomingToken } = req.body;
        const cookieToken = req.cookies && req.cookies.refreshToken;
        const token = incomingToken || cookieToken;

        if (!token) {
            return res.status(400).json({
                status: 'error',
                message: 'Refresh token is required.',
            });
        }

        // Verify the refresh token JWT
        let decoded;
        try {
            decoded = verifyToken(token);
        } catch {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired refresh token.',
            });
        }

        // Check token exists in DB
        const storedToken = await prisma.refreshToken.findUnique({
            where: { token },
        });

        if (!storedToken) {
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token not recognized.',
            });
        }

        if (storedToken.expiresAt < new Date()) {
            return res.status(401).json({
                status: 'error',
                message: 'Refresh token has expired.',
            });
        }

        // VULNERABLE: Token reuse — old refresh token is NOT deleted after use
        // An attacker who intercepts a refresh token can use it indefinitely.
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures

        // Fetch user
        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'User not found.',
            });
        }

        // Issue new tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        // Store new refresh token (old one is left active — vulnerable)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: user.id,
                expiresAt,
            },
        });

        res.cookie('accessToken', newAccessToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'none',
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'none',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Tokens refreshed.',
            data: {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/auth/logout
 * Clear cookies and (optionally) invalidate the refresh token.
 */
async function logout(req, res, next) {
    try {
        // VULNERABLE: Only clears cookies — does NOT invalidate the refresh token in DB.
        // Token can still be replayed from another client.
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        // Audit log
        await createAuditLog({
            userId: req.user ? req.user.id : null,
            action: 'LOGOUT',
            entity: 'User',
            entityId: req.user ? req.user.id : null,
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Logged out successfully.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/auth/forgot-password
 * Generate a password reset token and return it (mock email).
 */
async function forgotPassword(req, res, next) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                status: 'error',
                message: 'Email is required.',
            });
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // VULNERABLE: Account enumeration — different response when email exists vs not
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'No account found with this email.',
            });
        }

        // Generate a reset token
        // VULNERABLE: Predictable token — using simple hex instead of cryptographically random
        // Maps to: OWASP A02:2021 – Cryptographic Failures
        const resetToken = crypto.randomBytes(20).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await prisma.passwordResetToken.create({
            data: {
                token: resetToken,
                userId: user.id,
                expiresAt,
            },
        });

        // VULNERABLE: Password reset token returned in API response (should be emailed)
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        // PortSwigger – Authentication vulnerabilities (Password reset poisoning)
        return res.status(200).json({
            status: 'success',
            message: 'Password reset token generated. Check your email.',
            data: {
                resetToken,
                resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/auth/reset-password
 * Reset password using a valid reset token.
 */
async function resetPassword(req, res, next) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'Token and new password are required.',
            });
        }

        // VULNERABLE: Password reset token reuse — we check used flag but still accept
        // tokens that have been used if the `used` field was not properly set.
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        const resetRecord = await prisma.passwordResetToken.findFirst({
            where: { token },
        });

        if (!resetRecord) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid reset token.',
            });
        }

        if (resetRecord.expiresAt < new Date()) {
            return res.status(400).json({
                status: 'error',
                message: 'Reset token has expired.',
            });
        }

        // VULNERABLE: Token reuse — the `used` flag is NOT checked, so a token
        // can be replayed after it was already used once.
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures

        const hashedPw = await hashPassword(newPassword);

        await prisma.user.update({
            where: { id: resetRecord.userId },
            data: { password: hashedPw },
        });

        // Mark token as "used" — but we don't check this flag above (vulnerable)
        await prisma.passwordResetToken.update({
            where: { id: resetRecord.id },
            data: { used: true },
        });

        await createAuditLog({
            userId: resetRecord.userId,
            action: 'PASSWORD_RESET',
            entity: 'User',
            entityId: resetRecord.userId,
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Password has been reset successfully.',
        });
    } catch (error) {
        next(error);
    }
}

export {
    register,
    login,
    refreshTokenHandler as refreshToken,
    logout,
    forgotPassword,
    resetPassword,
};
