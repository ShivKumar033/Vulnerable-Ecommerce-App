import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// User Account Management Controller
// ──────────────────────────────────────────────────────────────

// ═══════════════════════════
// PROFILE
// ═══════════════════════════

/**
 * GET /api/v1/users/profile
 * Get the authenticated user's profile.
 */
async function getProfile(req, res, next) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                addresses: true,
                savedPayments: true,
                oauthAccounts: {
                    select: { id: true, provider: true, email: true, createdAt: true },
                },
                _count: {
                    select: { orders: true, reviews: true },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    avatar: user.avatar,
                    bio: user.bio,
                    displayName: user.displayName,
                    role: user.role,
                    isEmailVerified: user.isEmailVerified,
                    isActive: user.isActive,
                    addresses: user.addresses,
                    savedPayments: user.savedPayments,
                    oauthAccounts: user.oauthAccounts,
                    orderCount: user._count.orders,
                    reviewCount: user._count.reviews,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/users/profile
 * Update the authenticated user's profile.
 */
async function updateProfile(req, res, next) {
    try {
        const { firstName, lastName, phone, avatar, role, bio, displayName } = req.body;

        // VULNERABLE: Mass assignment — client can send `role` to escalate privileges
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(avatar !== undefined && { avatar }),
                ...(role !== undefined && { role }), // VULNERABLE: role update allowed
                ...(bio !== undefined && { bio }),
                ...(displayName !== undefined && { displayName }),
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'PROFILE_UPDATED',
            entity: 'User',
            entityId: user.id,
            metadata: { changes: req.body },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Profile updated.',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    avatar: user.avatar,
                    bio: user.bio,
                    displayName: user.displayName,
                    role: user.role,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/users/change-password
 * Change the authenticated user's password.
 */
async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'currentPassword and newPassword are required.',
            });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user || !user.password) {
            return res.status(400).json({
                status: 'error',
                message: 'Cannot change password for OAuth-only accounts.',
            });
        }

        // const { comparePassword } = require('../utils/password'); // Imported at top
        const isValid = await comparePassword(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ status: 'error', message: 'Current password is incorrect.' });
        }

        const hashed = await hashPassword(newPassword);
        await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

        await createAuditLog({
            userId: req.user.id,
            action: 'PASSWORD_CHANGED',
            entity: 'User',
            entityId: req.user.id,
            req,
        });

        return res.status(200).json({ status: 'success', message: 'Password changed successfully.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// EMAIL VERIFICATION (mock)
// ═══════════════════════════

/**
 * POST /api/v1/users/verify-email/send
 * Send a mock email verification token.
 */
async function sendVerificationEmail(req, res, next) {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found.' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ status: 'error', message: 'Email is already verified.' });
        }

        // Generate a simple verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Store token in audit log as a mock (in a real app this would be a separate table)
        await createAuditLog({
            userId: user.id,
            action: 'EMAIL_VERIFICATION_SENT',
            entity: 'User',
            entityId: user.id,
            metadata: { verificationToken },
            req,
        });

        // VULNERABLE: Token returned directly in response instead of being emailed
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        return res.status(200).json({
            status: 'success',
            message: 'Verification email sent. Check your inbox.',
            data: {
                verificationToken,
                verifyUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/users/verify-email/confirm
 * Confirm email verification using token.
 */
async function confirmEmailVerification(req, res, next) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ status: 'error', message: 'Verification token is required.' });
        }

        // In a real system, we'd look up the token in a table.
        // For this mock, we just set email as verified for the current user.
        // VULNERABLE: Any token is accepted — no actual token validation
        // Maps to: OWASP A07:2021 – Identification and Authentication Failures
        await prisma.user.update({
            where: { id: req.user.id },
            data: { isEmailVerified: true },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'EMAIL_VERIFIED',
            entity: 'User',
            entityId: req.user.id,
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Email verified successfully.',
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// ADDRESSES
// ═══════════════════════════

/**
 * GET /api/v1/users/addresses
 */
async function listAddresses(req, res, next) {
    try {
        const addresses = await prisma.address.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ status: 'success', data: { addresses } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/users/addresses
 */
async function createAddress(req, res, next) {
    try {
        const { label, fullName, addressLine1, addressLine2, city, state, postalCode, country, phone, isDefault } = req.body;

        if (!fullName || !addressLine1 || !city || !state || !postalCode) {
            return res.status(400).json({
                status: 'error',
                message: 'fullName, addressLine1, city, state, postalCode are required.',
            });
        }

        // If this is the default, unset any existing default
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId: req.user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const address = await prisma.address.create({
            data: {
                userId: req.user.id,
                label: label || null,
                fullName,
                addressLine1,
                addressLine2: addressLine2 || null,
                city,
                state,
                postalCode,
                country: country || 'US',
                phone: phone || null,
                isDefault: isDefault || false,
            },
        });

        return res.status(201).json({
            status: 'success',
            message: 'Address created.',
            data: { address },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/users/addresses/:id
 */
async function updateAddress(req, res, next) {
    try {
        const { id } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const existing = await prisma.address.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Address not found.' });
        }

        const { label, fullName, addressLine1, addressLine2, city, state, postalCode, country, phone, isDefault } = req.body;

        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId: existing.userId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const address = await prisma.address.update({
            where: { id },
            data: {
                ...(label !== undefined && { label }),
                ...(fullName !== undefined && { fullName }),
                ...(addressLine1 !== undefined && { addressLine1 }),
                ...(addressLine2 !== undefined && { addressLine2 }),
                ...(city !== undefined && { city }),
                ...(state !== undefined && { state }),
                ...(postalCode !== undefined && { postalCode }),
                ...(country !== undefined && { country }),
                ...(phone !== undefined && { phone }),
                ...(isDefault !== undefined && { isDefault }),
            },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Address updated.',
            data: { address },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/users/addresses/:id
 */
async function deleteAddress(req, res, next) {
    try {
        const { id } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const existing = await prisma.address.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Address not found.' });
        }

        await prisma.address.delete({ where: { id } });

        return res.status(200).json({
            status: 'success',
            message: 'Address deleted.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/users/addresses/:id/preview
 * VULNERABLE: Reflected XSS — address field rendered without HTML encoding
 * Maps to: OWASP A03:2021 – Injection
 * PortSwigger – Reflected XSS
 * 
 * This endpoint renders the address label without sanitization,
 * allowing script injection via the label field.
 */
async function previewAddress(req, res, next) {
    try {
        const { id } = req.params;

        const address = await prisma.address.findUnique({ where: { id } });
        
        if (!address) {
            return res.status(404).json({ status: 'error', message: 'Address not found.' });
        }

        // VULNERABLE: Reflected XSS — rendering address.label directly without encoding
        // An attacker can set the label to something like: <script>alert('xss')</script>
        // and it will be reflected in the response without sanitization
        const previewHtml = `
            <div class="address-preview">
                <h3>${address.label}</h3>
                <p>${address.fullName}</p>
                <p>${address.addressLine1}</p>
                ${address.addressLine2 ? `<p>${address.addressLine2}</p>` : ''}
                <p>${address.city}, ${address.state} ${address.postalCode}</p>
                <p>${address.country}</p>
                ${address.phone ? `<p>Phone: ${address.phone}</p>` : ''}
            </div>
        `;

        return res.status(200).json({
            status: 'success',
            data: {
                preview: previewHtml,
                // Also return raw label for debugging (vulnerable)
                rawLabel: address.label,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// WISHLIST
// ═══════════════════════════

/**
 * GET /api/v1/users/wishlist
 */
async function getWishlist(req, res, next) {
    try {
        let wishlist = await prisma.wishlist.findUnique({
            where: { userId: req.user.id },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                price: true,
                                stock: true,
                                isActive: true,
                                images: { where: { isPrimary: true }, take: 1, select: { url: true } },
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!wishlist) {
            wishlist = await prisma.wishlist.create({
                data: { userId: req.user.id },
                include: { items: true },
            });
        }

        return res.status(200).json({
            status: 'success',
            data: {
                wishlist: {
                    id: wishlist.id,
                    items: wishlist.items,
                    itemCount: wishlist.items.length,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/users/wishlist
 */
async function addToWishlist(req, res, next) {
    try {
        const { productId } = req.body;

        if (!productId) {
            return res.status(400).json({ status: 'error', message: 'productId is required.' });
        }

        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found.' });
        }

        let wishlist = await prisma.wishlist.findUnique({ where: { userId: req.user.id } });
        if (!wishlist) {
            wishlist = await prisma.wishlist.create({ data: { userId: req.user.id } });
        }

        // Check if already in wishlist
        const existing = await prisma.wishlistItem.findUnique({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        });

        if (existing) {
            return res.status(409).json({ status: 'error', message: 'Product already in wishlist.' });
        }

        const item = await prisma.wishlistItem.create({
            data: { wishlistId: wishlist.id, productId },
            include: {
                product: { select: { id: true, title: true, price: true } },
            },
        });

        return res.status(201).json({
            status: 'success',
            message: 'Added to wishlist.',
            data: { item },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/users/wishlist/:productId
 */
async function removeFromWishlist(req, res, next) {
    try {
        const { productId } = req.params;

        const wishlist = await prisma.wishlist.findUnique({ where: { userId: req.user.id } });
        if (!wishlist) {
            return res.status(404).json({ status: 'error', message: 'Wishlist not found.' });
        }

        const item = await prisma.wishlistItem.findUnique({
            where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
        });

        if (!item) {
            return res.status(404).json({ status: 'error', message: 'Item not in wishlist.' });
        }

        await prisma.wishlistItem.delete({ where: { id: item.id } });

        return res.status(200).json({ status: 'success', message: 'Removed from wishlist.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// SAVED PAYMENT METHODS
// ═══════════════════════════

/**
 * GET /api/v1/users/payment-methods
 */
async function listSavedPayments(req, res, next) {
    try {
        const methods = await prisma.savedPaymentMethod.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json({ status: 'success', data: { paymentMethods: methods } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/users/payment-methods
 */
async function addSavedPayment(req, res, next) {
    try {
        const { type, last4, brand, expMonth, expYear, isDefault } = req.body;

        if (!type || !last4) {
            return res.status(400).json({
                status: 'error',
                message: 'type and last4 are required.',
            });
        }

        if (isDefault) {
            await prisma.savedPaymentMethod.updateMany({
                where: { userId: req.user.id, isDefault: true },
                data: { isDefault: false },
            });
        }

        const method = await prisma.savedPaymentMethod.create({
            data: {
                userId: req.user.id,
                type,
                last4,
                brand: brand || null,
                expMonth: expMonth || null,
                expYear: expYear || null,
                isDefault: isDefault || false,
            },
        });

        return res.status(201).json({
            status: 'success',
            message: 'Payment method saved.',
            data: { paymentMethod: method },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/users/payment-methods/:id
 */
async function deleteSavedPayment(req, res, next) {
    try {
        const { id } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const existing = await prisma.savedPaymentMethod.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Payment method not found.' });
        }

        await prisma.savedPaymentMethod.delete({ where: { id } });

        return res.status(200).json({ status: 'success', message: 'Payment method deleted.' });
    } catch (error) {
        next(error);
    }
}

// ═══════════════════════════
// DASHBOARD (per-role data)
// ═══════════════════════════

/**
 * GET /api/v1/users/dashboard
 * Returns role-specific dashboard data.
 */
async function getDashboard(req, res, next) {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const dashboardData = { role };

        if (role === 'USER') {
            const [orderCount, wishlistCount, recentOrders] = await Promise.all([
                prisma.order.count({ where: { userId } }),
                prisma.wishlistItem.count({ where: { wishlist: { userId } } }),
                prisma.order.findMany({
                    where: { userId },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
                }),
            ]);
            dashboardData.orderCount = orderCount;
            dashboardData.wishlistCount = wishlistCount;
            dashboardData.recentOrders = recentOrders;
        } else if (role === 'VENDOR') {
            const [productCount, orderCount, recentOrders] = await Promise.all([
                prisma.product.count({ where: { vendorId: userId } }),
                prisma.order.count({ where: { items: { some: { product: { vendorId: userId } } } } }),
                prisma.order.findMany({
                    where: { items: { some: { product: { vendorId: userId } } } },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
                }),
            ]);
            dashboardData.productCount = productCount;
            dashboardData.orderCount = orderCount;
            dashboardData.recentOrders = recentOrders;
        } else if (role === 'SUPPORT') {
            const [totalUsers, totalOrders, pendingOrders] = await Promise.all([
                prisma.user.count(),
                prisma.order.count(),
                prisma.order.count({ where: { status: 'PENDING' } }),
            ]);
            dashboardData.totalUsers = totalUsers;
            dashboardData.totalOrders = totalOrders;
            dashboardData.pendingOrders = pendingOrders;
        } else if (role === 'ADMIN') {
            // Admin gets full summary — forwarded to admin controller
            const [totalUsers, totalOrders, totalProducts, totalRevenue] = await Promise.all([
                prisma.user.count(),
                prisma.order.count(),
                prisma.product.count(),
                prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } } }),
            ]);
            dashboardData.totalUsers = totalUsers;
            dashboardData.totalOrders = totalOrders;
            dashboardData.totalProducts = totalProducts;
            dashboardData.totalRevenue = totalRevenue._sum.totalAmount || 0;
        }

        return res.status(200).json({ status: 'success', data: { dashboard: dashboardData } });
    } catch (error) {
        next(error);
    }
}

export {
    getProfile,
    updateProfile,
    changePassword,
    sendVerificationEmail,
    confirmEmailVerification,
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    previewAddress,
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    listSavedPayments,
    addSavedPayment,
    deleteSavedPayment,
    getDashboard,
};
