const { prisma } = require('../config/db');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
const { createAuditLog } = require('../utils/auditLog');

// ──────────────────────────────────────────────────────────────
// OAuth Controller (Google)
// ──────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback';

/**
 * GET /api/v1/auth/google
 * Redirect user to Google OAuth consent page.
 */
async function googleLogin(req, res, next) {
    try {
        // VULNERABLE: Missing state parameter validation — no CSRF protection in OAuth flow
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – OAuth authentication vulnerabilities (missing state)
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}` +
            `&response_type=code` +
            `&scope=openid%20email%20profile` +
            `&access_type=offline`;
        // Note: No `state` parameter — CSRF in OAuth

        return res.status(200).json({
            status: 'success',
            message: 'Redirect to Google for authentication.',
            data: { authUrl },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/auth/google/callback
 * Handle Google OAuth callback.
 */
async function googleCallback(req, res, next) {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({ status: 'error', message: 'Authorization code is required.' });
        }

        // VULNERABLE: state parameter is not validated (CSRF in OAuth)
        // Maps to: PortSwigger – OAuth authentication vulnerabilities

        // Exchange code for tokens
        let tokenData;
        try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: GOOGLE_CALLBACK_URL,
                    grant_type: 'authorization_code',
                }),
            });
            tokenData = await tokenResponse.json();
        } catch (fetchErr) {
            // For demo/testing: simulate a mock Google user
            tokenData = { id_token: null };
        }

        let googleUser;
        if (tokenData.id_token) {
            // VULNERABLE: OAuth token not verified against provider
            // We decode the JWT without verifying it against Google's public keys
            // Maps to: OWASP A07:2021 – Identification and Authentication Failures
            // PortSwigger – OAuth authentication vulnerabilities
            const parts = tokenData.id_token.split('.');
            if (parts.length >= 2) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                googleUser = {
                    providerId: payload.sub,
                    email: payload.email,
                    firstName: payload.given_name || '',
                    lastName: payload.family_name || '',
                };
            }
        }

        // For demo: if Google isn't actually configured, use query params
        if (!googleUser) {
            // VULNERABLE: Insecure OAuth callback — allows setting user info via query params
            // Maps to: PortSwigger – OAuth authentication vulnerabilities
            googleUser = {
                providerId: req.query.providerId || 'mock_google_' + Date.now(),
                email: req.query.email || `mock_${Date.now()}@gmail.com`,
                firstName: req.query.firstName || 'Google',
                lastName: req.query.lastName || 'User',
            };
        }

        // Check for existing OAuth account
        let oauthAccount = await prisma.oAuthAccount.findFirst({
            where: {
                provider: 'google',
                providerId: googleUser.providerId,
            },
            include: { user: true },
        });

        let user;

        if (oauthAccount) {
            // Existing OAuth user — log them in
            user = oauthAccount.user;
        } else {
            // Check if a user with this email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: googleUser.email },
            });

            if (existingUser) {
                // VULNERABLE: OAuth account linking without re-authentication
                // An attacker can bind their OAuth to a victim's account if they
                // register with the same email first
                // Maps to: OWASP A01:2021 – Broken Access Control
                // PortSwigger – OAuth authentication vulnerabilities
                user = existingUser;

                // VULNERABLE: Email trust issue — attacker registers same email with Google
                // Maps to: PortSwigger – OAuth authentication vulnerabilities
                await prisma.oAuthAccount.create({
                    data: {
                        provider: 'google',
                        providerId: googleUser.providerId,
                        email: googleUser.email,
                        userId: existingUser.id,
                    },
                });
            } else {
                // Auto-registration — create new user
                user = await prisma.user.create({
                    data: {
                        email: googleUser.email,
                        firstName: googleUser.firstName,
                        lastName: googleUser.lastName,
                        isEmailVerified: true, // Trust Google's email
                        role: 'USER',
                        oauthAccounts: {
                            create: {
                                provider: 'google',
                                providerId: googleUser.providerId,
                                email: googleUser.email,
                            },
                        },
                    },
                });
            }
        }

        // Generate JWT tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.refreshToken.create({
            data: { token: refreshToken, userId: user.id, expiresAt },
        });

        // Set cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: false, secure: false, sameSite: 'none', maxAge: 15 * 60 * 1000,
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: false, secure: false, sameSite: 'none', maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        await createAuditLog({
            userId: user.id,
            action: 'OAUTH_LOGIN',
            entity: 'User',
            entityId: user.id,
            metadata: { provider: 'google', providerId: googleUser.providerId },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'OAuth login successful.',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
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
 * POST /api/v1/auth/oauth/link
 * Link an OAuth account to the current logged-in user.
 */
async function linkOAuthAccount(req, res, next) {
    try {
        const { provider, providerId, email } = req.body;

        if (!provider || !providerId) {
            return res.status(400).json({
                status: 'error',
                message: 'provider and providerId are required.',
            });
        }

        // VULNERABLE: OAuth account linking without re-authentication
        // No password confirmation required to link an OAuth account
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – OAuth authentication vulnerabilities

        // VULNERABLE: Can bind OAuth to any existing user (account takeover)
        // If userId is sent in body, it's used instead of req.user.id
        // Maps to: PortSwigger – OAuth authentication vulnerabilities
        const userId = req.body.userId || req.user.id;

        const existing = await prisma.oAuthAccount.findFirst({
            where: { provider, providerId },
        });

        if (existing) {
            return res.status(409).json({ status: 'error', message: 'This OAuth account is already linked.' });
        }

        const oauthAccount = await prisma.oAuthAccount.create({
            data: {
                provider,
                providerId,
                email: email || null,
                userId,
            },
        });

        return res.status(201).json({
            status: 'success',
            message: 'OAuth account linked.',
            data: { oauthAccount },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/auth/oauth/unlink/:id
 * Unlink an OAuth account.
 */
async function unlinkOAuthAccount(req, res, next) {
    try {
        const { id } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const account = await prisma.oAuthAccount.findUnique({ where: { id } });
        if (!account) {
            return res.status(404).json({ status: 'error', message: 'OAuth account not found.' });
        }

        await prisma.oAuthAccount.delete({ where: { id } });

        return res.status(200).json({ status: 'success', message: 'OAuth account unlinked.' });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    googleLogin,
    googleCallback,
    linkOAuthAccount,
    unlinkOAuthAccount,
};
