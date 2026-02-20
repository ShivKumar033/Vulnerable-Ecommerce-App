import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Cart Controller
// ──────────────────────────────────────────────────────────────

// Guest cart helpers
function getGuestCartId(req, res) {
    // Check for existing guest cart ID in cookies
    let guestCartId = req.cookies?.guestCartId;
    
    if (!guestCartId) {
        // Generate new guest cart ID
        guestCartId = `guest_${crypto.randomBytes(16).toString('hex')}`;
        // Set cookie for 30 days
        res.cookie('guestCartId', guestCartId, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'lax'
        });
    }
    
    return guestCartId;
}

function getCartUserId(req) {
    // If user is authenticated, use their ID
    // Otherwise, use guest cart ID
    return req.user ? req.user.id : req.cookies?.guestCartId;
}

/**
 * GET /api/v1/cart
 * View the cart (authenticated user or guest).
 */
async function getCart(req, res, next) {
    try {
        let cart;
        let isGuest = false;

        if (req.user) {
            // Authenticated user's cart
            cart = await prisma.cart.findUnique({
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
                                    images: {
                                        where: { isPrimary: true },
                                        select: { url: true },
                                        take: 1,
                                    },
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });

            if (!cart) {
                cart = await prisma.cart.create({
                    data: { userId: req.user.id },
                    include: { items: true },
                });
            }
        } else {
            // Guest cart - VULNERABLE: No authentication required
            // Maps to: OWASP A01:2021 – Broken Access Control
            isGuest = true;
            const guestCartId = getGuestCartId(req, res);

            cart = await prisma.guestCart.findUnique({
                where: { sessionId: guestCartId },
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
                                    images: {
                                        where: { isPrimary: true },
                                        select: { url: true },
                                        take: 1,
                                    },
                                },
                            },
                        },
                        orderBy: { createdAt: 'asc' },
                    },
                },
            });

            if (!cart) {
                cart = await prisma.guestCart.create({
                    data: { sessionId: guestCartId },
                    include: { items: true },
                });
            }
        }

        // Calculate totals
        const subtotal = cart.items.reduce((sum, item) => {
            return sum + parseFloat(item.price) * item.quantity;
        }, 0);

        return res.status(200).json({
            status: 'success',
            data: {
                cart: {
                    id: cart.id,
                    items: cart.items,
                    itemCount: cart.items.length,
                    subtotal: Math.round(subtotal * 100) / 100,
                    isGuest,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/cart
 * Add an item to the cart (authenticated user or guest).
 */
async function addToCart(req, res, next) {
    try {
        const { productId, quantity = 1, price } = req.body;

        if (!productId) {
            return res.status(400).json({
                status: 'error',
                message: 'productId is required.',
            });
        }

        // Verify product exists and is active
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product || !product.isActive) {
            return res.status(404).json({
                status: 'error',
                message: 'Product not found or is inactive.',
            });
        }

        // VULNERABLE: No stock validation — items can be added even when out of stock
        // Maps to: OWASP A04:2021 – Insecure Design

        let cartItem;

        if (req.user) {
            // Authenticated user's cart
            let cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
            if (!cart) {
                cart = await prisma.cart.create({ data: { userId: req.user.id } });
            }

            // VULNERABLE: Price manipulation — if client sends `price`, it's used directly
            const itemPrice = price !== undefined ? parseFloat(price) : parseFloat(product.price);

            const existingItem = await prisma.cartItem.findUnique({
                where: {
                    cartId_productId: {
                        cartId: cart.id,
                        productId,
                    },
                },
            });

            if (existingItem) {
                cartItem = await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + parseInt(quantity, 10),
                        price: itemPrice,
                    },
                    include: {
                        product: { select: { id: true, title: true, price: true } },
                    },
                });
            } else {
                cartItem = await prisma.cartItem.create({
                    data: {
                        cartId: cart.id,
                        productId,
                        quantity: parseInt(quantity, 10),
                        price: itemPrice,
                    },
                    include: {
                        product: { select: { id: true, title: true, price: true } },
                    },
                });
            }
        } else {
            // Guest cart - VULNERABLE: No authentication required
            const guestCartId = getGuestCartId(req, res);

            let cart = await prisma.guestCart.findUnique({ where: { sessionId: guestCartId } });
            if (!cart) {
                cart = await prisma.guestCart.create({ data: { sessionId: guestCartId } });
            }

            const itemPrice = price !== undefined ? parseFloat(price) : parseFloat(product.price);

            const existingItem = await prisma.guestCartItem.findUnique({
                where: {
                    cartId_productId: {
                        cartId: cart.id,
                        productId,
                    },
                },
            });

            if (existingItem) {
                cartItem = await prisma.guestCartItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + parseInt(quantity, 10),
                        price: itemPrice,
                    },
                    include: {
                        product: { select: { id: true, title: true, price: true } },
                    },
                });
            } else {
                cartItem = await prisma.guestCartItem.create({
                    data: {
                        cartId: cart.id,
                        productId,
                        quantity: parseInt(quantity, 10),
                        price: itemPrice,
                    },
                    include: {
                        product: { select: { id: true, title: true, price: true } },
                    },
                });
            }
        }

        return res.status(200).json({
            status: 'success',
            message: 'Item added to cart.',
            data: { cartItem },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/cart/:itemId
 * Update the quantity of a cart item.
 */
async function updateCartItem(req, res, next) {
    try {
        const { itemId } = req.params;
        const { quantity, price } = req.body;

        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid quantity is required.',
            });
        }

        // Try authenticated user's cart first
        let cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true },
        });

        // If not found, try guest cart
        if (!cartItem) {
            cartItem = await prisma.guestCartItem.findUnique({
                where: { id: itemId },
                include: { cart: true },
            });
        }

        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found.',
            });
        }

        // If quantity is 0, remove the item
        if (parseInt(quantity, 10) === 0) {
            if (cartItem.cart && cartItem.cart.userId) {
                await prisma.cartItem.delete({ where: { id: itemId } });
            } else {
                await prisma.guestCartItem.delete({ where: { id: itemId } });
            }
            return res.status(200).json({
                status: 'success',
                message: 'Item removed from cart.',
            });
        }

        let updatedItem;
        if (cartItem.cart && cartItem.cart.userId) {
            updatedItem = await prisma.cartItem.update({
                where: { id: itemId },
                data: {
                    quantity: parseInt(quantity, 10),
                    ...(price !== undefined && { price: parseFloat(price) }),
                },
                include: {
                    product: { select: { id: true, title: true, price: true } },
                },
            });
        } else {
            updatedItem = await prisma.guestCartItem.update({
                where: { id: itemId },
                data: {
                    quantity: parseInt(quantity, 10),
                    ...(price !== undefined && { price: parseFloat(price) }),
                },
                include: {
                    product: { select: { id: true, title: true, price: true } },
                },
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Cart item updated.',
            data: { cartItem: updatedItem },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/cart/:itemId
 * Remove an item from the cart.
 */
async function removeFromCart(req, res, next) {
    try {
        const { itemId } = req.params;

        // Try authenticated user's cart first
        let cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
        });

        // If not found, try guest cart
        if (!cartItem) {
            cartItem = await prisma.guestCartItem.findUnique({
                where: { id: itemId },
            });
        }

        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found.',
            });
        }

        if (cartItem.cartId) {
            // Check if it's a user cart or guest cart
            const userCart = await prisma.cart.findUnique({ where: { id: cartItem.cartId } });
            if (userCart) {
                await prisma.cartItem.delete({ where: { id: itemId } });
            } else {
                await prisma.guestCartItem.delete({ where: { id: itemId } });
            }
        }

        return res.status(200).json({
            status: 'success',
            message: 'Item removed from cart.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/cart/merge
 * Merge guest cart with authenticated user's cart.
 */
async function mergeGuestCart(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.',
            });
        }

        const guestCartId = req.cookies?.guestCartId;
        
        if (!guestCartId) {
            return res.status(200).json({
                status: 'success',
                message: 'No guest cart to merge.',
            });
        }

        // Get guest cart items
        const guestCart = await prisma.guestCart.findUnique({
            where: { sessionId: guestCartId },
            include: { items: true },
        });

        if (!guestCart || guestCart.items.length === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No guest cart items to merge.',
            });
        }

        // Get or create user's cart
        let userCart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
        if (!userCart) {
            userCart = await prisma.cart.create({ data: { userId: req.user.id } });
        }

        // Merge items
        for (const guestItem of guestCart.items) {
            const existingItem = await prisma.cartItem.findUnique({
                where: {
                    cartId_productId: {
                        cartId: userCart.id,
                        productId: guestItem.productId,
                    },
                },
            });

            if (existingItem) {
                // Update quantity
                await prisma.cartItem.update({
                    where: { id: existingItem.id },
                    data: {
                        quantity: existingItem.quantity + guestItem.quantity,
                        // Use the higher price (usually guest cart has manipulated price)
                        price: parseFloat(guestItem.price) > parseFloat(existingItem.price) 
                            ? guestItem.price 
                            : existingItem.price,
                    },
                });
            } else {
                // Create new item
                await prisma.cartItem.create({
                    data: {
                        cartId: userCart.id,
                        productId: guestItem.productId,
                        quantity: guestItem.quantity,
                        price: guestItem.price,
                    },
                });
            }
        }

        // Delete guest cart
        await prisma.guestCartItem.deleteMany({ where: { cartId: guestCart.id } });
        await prisma.guestCart.delete({ where: { id: guestCart.id } });

        // Clear guest cart cookie
        res.clearCookie('guestCartId');

        return res.status(200).json({
            status: 'success',
            message: 'Guest cart merged with your cart.',
        });
    } catch (error) {
        next(error);
    }
}

export {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    mergeGuestCart,
};
