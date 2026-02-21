import { prisma } from '../config/db.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { createAuditLog } from '../utils/auditLog.js';

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
 * 
 * VULNERABLE: redirect_uri validation bypass
 * Maps to: OWASP A01:2021 – Broken Access Control
 * PortSwigger – OAuth authentication vulnerabilities
 */
async function googleCallback(req, res, next) {
    try {
        const { code, state, redirect_uri } = req.query;

        if (!code) {
            return res.status(400).json({ status: 'error', message: 'Authorization code is required.' });
        }

        // VULNERABLE: state parameter is not validated (CSRF in OAuth)
        // Maps to: PortSwigger – OAuth authentication vulnerabilities

        // VULNERABLE: redirect_uri can be overridden via query parameter
        // OAuth best practices require redirect_uri to match exactly what's registered
        // This allows attackers to redirect to malicious URLs after successful auth
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – OAuth authentication vulnerabilities (redirect_uri validation bypass)
        const callbackUrl = redirect_uri || GOOGLE_CALLBACK_URL;

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
                    redirect_uri: callbackUrl,
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

/**
 * GET /api/v1/auth/google/link
 * Initiate Google OAuth flow for linking account to existing user.
 * Requires authentication - user must be logged in to link OAuth.
 */
async function googleLinkLogin(req, res, next) {
    try {
        // VULNERABLE: Missing state parameter — no CSRF protection in OAuth flow
        // This is intentionally vulnerable for security testing
        const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${GOOGLE_CLIENT_ID}` +
            `&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL.replace('/callback', '/link/callback'))}` +
            `&response_type=code` +
            `&scope=openid%20email%20profile` +
            `&access_type=offline` +
            `&state=${state}`;

        return res.status(200).json({
            status: 'success',
            message: 'Redirect to Google to link your account.',
            data: { authUrl },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/auth/google/link/callback
 * Handle Google OAuth callback for account linking.
 * Links the OAuth account to the currently authenticated user.
 */
async function googleLinkCallback(req, res, next) {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Authorization code and state are required.' 
            });
        }

        // VULNERABLE: state parameter is not validated properly (CSRF in OAuth)
        // Maps to: PortSwigger – OAuth authentication vulnerabilities
        
        // Decode state to get userId
        let userId;
        try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            userId = decoded.userId;
        } catch (e) {
            // VULNERABLE: If state is invalid, still accept the request
            userId = req.query.userId || null;
        }

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
                    redirect_uri: GOOGLE_CALLBACK_URL.replace('/callback', '/link/callback'),
                    grant_type: 'authorization_code',
                }),
            });
            tokenData = await tokenResponse.json();
        } catch (fetchErr) {
            tokenData = { id_token: null };
        }

        let googleUser;
        if (tokenData.id_token) {
            // Decode JWT without verification (intentionally vulnerable)
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

        // Fallback for demo: use query params if Google isn't configured
        if (!googleUser) {
            // VULNERABLE: Insecure OAuth callback — allows setting user info via query params
            googleUser = {
                providerId: req.query.providerId || 'mock_google_' + Date.now(),
                email: req.query.email || `mock_${Date.now()}@gmail.com`,
                firstName: req.query.firstName || 'Google',
                lastName: req.query.lastName || 'User',
            };
        }

        // If no userId from state, try to find existing user by email
        if (!userId && googleUser.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: googleUser.email },
            });
            if (existingUser) {
                userId = existingUser.id;
            }
        }

        if (!userId) {
            return res.status(400).json({
                status: 'error',
                message: 'Unable to link account. Please log in first.',
            });
        }

        // Check if this OAuth account is already linked to another user
        const existingOAuth = await prisma.oAuthAccount.findFirst({
            where: {
                provider: 'google',
                providerId: googleUser.providerId,
            },
        });

        if (existingOAuth) {
            if (existingOAuth.userId === userId) {
                return res.status(200).json({
                    status: 'success',
                    message: 'This Google account is already linked to your account.',
                });
            }
            // VULNERABLE: OAuth account can be re-linked to different user (account takeover)
            // Maps to: PortSwigger – OAuth authentication vulnerabilities
            // Allow reassigning to new user (vulnerable behavior for testing)
            await prisma.oAuthAccount.update({
                where: { id: existingOAuth.id },
                data: { userId, email: googleUser.email },
            });
            
            await createAuditLog({
                userId,
                action: 'OAUTH_ACCOUNT_RELINKED',
                entity: 'User',
                entityId: userId,
                metadata: { provider: 'google', providerId: googleUser.providerId, email: googleUser.email },
                req,
            });

            return res.status(200).json({
                status: 'success',
                message: 'Google account linked successfully.',
            });
        }

        // Create new OAuth account linked to the authenticated user
        const oauthAccount = await prisma.oAuthAccount.create({
            data: {
                provider: 'google',
                providerId: googleUser.providerId,
                email: googleUser.email,
                userId,
            },
        });

        await createAuditLog({
            userId,
            action: 'OAUTH_ACCOUNT_LINKED',
            entity: 'User',
            entityId: userId,
            metadata: { provider: 'google', providerId: googleUser.providerId, email: googleUser.email },
            req,
        });

        // Redirect back to frontend with success
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/settings?oauth=linked&provider=google`);

    } catch (error) {
        next(error);
    }
}

export {
    googleLogin,
    googleCallback,
    linkOAuthAccount,
    unlinkOAuthAccount,
    googleLinkLogin,
    googleLinkCallback,
};
