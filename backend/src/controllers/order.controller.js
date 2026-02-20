import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import { sendOrderConfirmation } from '../utils/email.js';

// ──────────────────────────────────────────────────────────────
// Order Controller
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/orders/checkout
 * Convert cart to order, deduct stock.
 * Supports: couponCode, giftCardCode, useWalletCredits, useLoyaltyPoints
 */
async function checkout(req, res, next) {
    try {
        const userId = req.user.id;
        const { addressId, couponCode, giftCardCode, useWalletCredits, useLoyaltyPoints, notes } = req.body;

        // Fetch cart with items (authenticated user cart)
        let cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        // If no cart, try to get guest cart
        if (!cart || cart.items.length === 0) {
            const guestCartId = req.cookies?.guestCartId;
            if (guestCartId) {
                cart = await prisma.guestCart.findUnique({
                    where: { sessionId: guestCartId },
                    include: {
                        items: {
                            include: {
                                product: true,
                            },
                        },
                    },
                });
            }
        }

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Cart is empty. Add items before checking out.',
            });
        }

        // VULNERABLE: Race condition — no transaction or row-level locking.
        // Two concurrent checkout requests can both read the same stock,
        // both succeed, and over-sell products.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Race Conditions

        // Calculate subtotal from cart item prices (which may have been manipulated)
        let subtotal = 0;
        const orderItems = [];

        for (const item of cart.items) {
            // VULNERABLE: No re-validation of price from the product table.
            // The price in the cart item (set by the client) is used directly.
            // Maps to: OWASP A04:2021 – Insecure Design
            // PortSwigger – Business Logic Vulnerabilities
            const itemTotal = parseFloat(item.price) * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                productId: item.productId,
                quantity: item.quantity,
                price: parseFloat(item.price),
            });

            // Deduct stock (no locking — race condition)
            await prisma.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }

        // Apply coupon if provided
        let discount = 0;
        let couponId = null;

        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: couponCode },
            });

            if (coupon && coupon.isActive) {
                // VULNERABLE: Coupon reuse — no per-user usage tracking.
                // Same user can apply the same coupon on every order.
                // Maps to: OWASP A04:2021 – Insecure Design
                // PortSwigger – Business Logic Vulnerabilities

                if (coupon.expiresAt && coupon.expiresAt < new Date()) {
                    // Expired coupon — silently ignore (no error)
                } else if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
                    // Max uses reached — silently ignore
                } else {
                    if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount)) {
                        // Min order not met — silently ignore
                    } else {
                        if (coupon.discountType === 'percentage') {
                            discount = (subtotal * parseFloat(coupon.discountValue)) / 100;
                        } else {
                            discount = parseFloat(coupon.discountValue);
                        }

                        couponId = coupon.id;

                        // Increment coupon usage (but no per-user tracking)
                        await prisma.coupon.update({
                            where: { id: coupon.id },
                            data: { currentUses: { increment: 1 } },
                        });
                    }
                }
            }
        }

        // VULNERABLE: Gift card redemption at checkout - Race condition vulnerability
        // Gift card balance can be double-spent
        let giftCardDiscount = 0;
        if (giftCardCode) {
            const giftCard = await prisma.giftCard.findUnique({
                where: { code: giftCardCode.toUpperCase() },
            });

            if (giftCard && giftCard.status === 'ACTIVE') {
                if (!giftCard.expiresAt || giftCard.expiresAt > new Date()) {
                    if (giftCard.currentBalance >= subtotal) {
                        giftCardDiscount = subtotal;
                    } else {
                        giftCardDiscount = parseFloat(giftCard.currentBalance);
                    }

                    // Update gift card balance (race condition vulnerable)
                    await prisma.giftCard.update({
                        where: { id: giftCard.id },
                        data: { 
                            currentBalance: { decrement: giftCardDiscount },
                            redeemedById: userId,
                        },
                    });

                    // Record transaction
                    await prisma.giftCardTransaction.create({
                        data: {
                            giftCardId: giftCard.id,
                            type: 'REDEEM',
                            amount: giftCardDiscount,
                            description: 'Applied to order',
                        },
                    });
                }
            }
        }

        // VULNERABLE: Wallet/Store credit application - Race condition vulnerability
        // Wallet balance can be double-spent
        let walletDiscount = 0;
        if (useWalletCredits && parseFloat(useWalletCredits) > 0) {
            const wallet = await prisma.wallet.findUnique({
                where: { userId },
            });

            if (wallet) {
                const walletBalance = parseFloat(wallet.balance);
                const requestedCredit = parseFloat(useWalletCredits);
                
                // Calculate remaining after gift card
                const remainingAfterGift = subtotal - giftCardDiscount;
                
                if (walletBalance >= requestedCredit && requestedCredit <= remainingAfterGift) {
                    walletDiscount = requestedCredit;
                    
                    // Debit wallet (race condition vulnerable)
                    await prisma.wallet.update({
                        where: { id: wallet.id },
                        data: { balance: { decrement: walletDiscount } },
                    });

                    // Record transaction
                    await prisma.walletTransaction.create({
                        data: {
                            walletId: wallet.id,
                            type: 'debit',
                            amount: walletDiscount,
                            description: 'Applied to order',
                        },
                    });
                }
            }
        }

        // VULNERABLE: Loyalty points redemption - Race condition vulnerability
        // Loyalty points can be double-spent
        let loyaltyDiscount = 0;
        if (useLoyaltyPoints && parseInt(useLoyaltyPoints) > 0) {
            const loyalty = await prisma.loyaltyPoint.findUnique({
                where: { userId },
            });

            if (loyalty) {
                const pointsBalance = loyalty.balance;
                const requestedPoints = parseInt(useLoyaltyPoints);
                
                // Calculate remaining after gift card and wallet
                const remainingAfterWallet = subtotal - giftCardDiscount - walletDiscount;
                
                // Convert points to dollar value: 100 points = $1
                const pointsValue = requestedPoints / 100;
                
                if (pointsBalance >= requestedPoints && pointsValue <= remainingAfterWallet) {
                    loyaltyDiscount = pointsValue;
                    
                    // Redeem points (race condition vulnerable)
                    await prisma.loyaltyPoint.update({
                        where: { id: loyalty.id },
                        data: { balance: { decrement: requestedPoints } },
                    });

                    // Record transaction
                    await prisma.loyaltyPointTransaction.create({
                        data: {
                            loyaltyPointId: loyalty.id,
                            type: 'REDEEM',
                            amount: -requestedPoints,
                            description: 'Applied to order',
                        },
                    });
                }
            }
        }

        // Simple tax & shipping calculation
        const taxRate = 0.08; // 8%
        const tax = subtotal * taxRate;
        const shippingCost = subtotal > 100 ? 0 : 9.99;
        
        // Calculate final total
        const totalAmount = subtotal + tax + shippingCost - discount - giftCardDiscount - walletDiscount - loyaltyDiscount;

        // Create the order
        const order = await prisma.order.create({
            data: {
                userId,
                addressId: addressId || null,
                status: 'PENDING',
                subtotal: Math.round(subtotal * 100) / 100,
                tax: Math.round(tax * 100) / 100,
                shippingCost: Math.round(shippingCost * 100) / 100,
                discount: Math.round((discount + giftCardDiscount + walletDiscount + loyaltyDiscount) * 100) / 100,
                totalAmount: Math.round(Math.max(0, totalAmount) * 100) / 100,
                couponId,
                notes: notes || null,
                items: {
                    create: orderItems,
                },
            },
            include: {
                items: {
                    include: {
                        product: { select: { id: true, title: true, slug: true } },
                    },
                },
            },
        });

        // Clear the cart after checkout
        if (cart.userId) {
            await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        } else {
            // Guest cart - also clear it
            await prisma.guestCartItem.deleteMany({ where: { cartId: cart.id } });
        }

        // Earn loyalty points from purchase (1 point per dollar spent)
        const earnedPoints = Math.floor(subtotal);
        if (earnedPoints > 0) {
            let loyalty = await prisma.loyaltyPoint.findUnique({ where: { userId } });
            if (!loyalty) {
                loyalty = await prisma.loyaltyPoint.create({ data: { userId } });
            }
            
            // VULNERABLE: Race condition in earning points
            await prisma.loyaltyPoint.update({
                where: { id: loyalty.id },
                data: { 
                    balance: { increment: earnedPoints },
                    lifetimeEarnings: { increment: earnedPoints },
                },
            });

            await prisma.loyaltyPointTransaction.create({
                data: {
                    loyaltyPointId: loyalty.id,
                    type: 'EARN',
                    amount: earnedPoints,
                    orderId: order.id,
                    description: `Earned ${earnedPoints} points from order`,
                },
            });
        }

        // Audit log
        await createAuditLog({
            userId,
            action: 'ORDER_CREATED',
            entity: 'Order',
            entityId: order.id,
            metadata: {
                orderNumber: order.orderNumber,
                totalAmount: order.totalAmount,
                itemCount: orderItems.length,
                giftCardApplied: giftCardDiscount,
                walletApplied: walletDiscount,
                loyaltyPointsApplied: useLoyaltyPoints,
            },
            req,
        });

        // Send order confirmation email (mock)
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const orderItemsForEmail = order.items.map((item) => ({
            product: item.product?.title || 'N/A',
            quantity: item.quantity,
            price: parseFloat(item.price),
        }));

        await sendOrderConfirmation({
            to: user.email,
            orderNumber: order.orderNumber,
            totalAmount: parseFloat(order.totalAmount),
            items: orderItemsForEmail,
            req,
        }).catch((err) => console.error('Failed to send order confirmation email:', err.message));

        return res.status(201).json({
            status: 'success',
            message: 'Order placed successfully.',
            data: { order },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/orders
 * List the authenticated user's orders.
 */
async function listOrders(req, res, next) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, status, search, orderNumber } = req.query;

        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 10;
        const skip = (pageNum - 1) * pageSize;

        const where = { userId };
        
        // Filter by status
        if (status) where.status = status;
        
        // VULNERABLE: Blind SQL injection — search parameter is used in raw query
        // when orderNumber is provided, allowing injection via query parameter.
        // Maps to: OWASP A03:2021 – Injection
        // PortSwigger – SQL Injection (Blind)
        
        // Add search filter for orderNumber (vulnerable to SQL injection)
        if (orderNumber) {
            where.orderNumber = orderNumber; // Direct assignment without sanitization
        }

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: {
                        include: {
                            product: { select: { id: true, title: true, slug: true } },
                        },
                    },
                    payment: true,
                },
            }),
            prisma.order.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                orders,
                pagination: {
                    page: pageNum,
                    limit: pageSize,
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/orders/:id
 * Get order details by ID.
 */
async function getOrder(req, res, next) {
    try {
        const { id } = req.params;

        // VULNERABLE: IDOR — no check that the order belongs to req.user.
        // Any authenticated user can view any order by guessing/enumerating IDs.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities (IDOR)
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                images: { where: { isPrimary: true }, take: 1 },
                            },
                        },
                    },
                },
                address: true,
                payment: true,
                coupon: true,
                // VULNERABLE: Excessive data exposure — including full user object
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
            },
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found.',
            });
        }

        return res.status(200).json({
            status: 'success',
            data: { order },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/orders/:id/status
 * Update order status. (Admin or the order owner — but intentionally weak checks)
 */
async function updateOrderStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        // VULNERABLE: Order status tampering — any authenticated user can change
        // any order's status. No ownership or admin check.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Business Logic Vulnerabilities
        const order = await prisma.order.update({
            where: { id },
            data: { status },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'ORDER_STATUS_UPDATED',
            entity: 'Order',
            entityId: id,
            metadata: { newStatus: status },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Order status updated.',
            data: { order },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/orders/admin/all
 * Admin: view all orders.
 */
async function listAllOrders(req, res, next) {
    try {
        const { page = 1, limit = 20, status, userId: filterUserId } = req.query;

        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        const where = {};
        if (status) where.status = status;
        if (filterUserId) where.userId = filterUserId;

        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    items: {
                        include: {
                            product: { select: { id: true, title: true } },
                        },
                    },
                    payment: true,
                },
            }),
            prisma.order.count({ where }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                orders,
                pagination: {
                    page: pageNum,
                    limit: pageSize,
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/orders/vendor/my-orders
 * Vendor: view orders containing their products.
 */
async function listVendorOrders(req, res, next) {
    try {
        const vendorId = req.user.id;
        const { page = 1, limit = 20 } = req.query;

        const pageNum = parseInt(page, 10) || 1;
        const pageSize = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * pageSize;

        // Find orders that contain items from this vendor's products
        const [orders, totalCount] = await Promise.all([
            prisma.order.findMany({
                where: {
                    items: {
                        some: {
                            product: {
                                vendorId,
                            },
                        },
                    },
                },
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true } },
                    items: {
                        where: {
                            product: { vendorId },
                        },
                        include: {
                            product: { select: { id: true, title: true, price: true } },
                        },
                    },
                    payment: { select: { status: true, amount: true } },
                },
            }),
            prisma.order.count({
                where: {
                    items: {
                        some: {
                            product: { vendorId },
                        },
                    },
                },
            }),
        ]);

        return res.status(200).json({
            status: 'success',
            data: {
                orders,
                pagination: {
                    page: pageNum,
                    limit: pageSize,
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

export {
    checkout,
    listOrders,
    getOrder,
    updateOrderStatus,
    listAllOrders,
    listVendorOrders,
};
