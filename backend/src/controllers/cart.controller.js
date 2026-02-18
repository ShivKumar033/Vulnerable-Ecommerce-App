import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';

// ──────────────────────────────────────────────────────────────
// Cart Controller
// ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/cart
 * View the authenticated user's cart.
 */
async function getCart(req, res, next) {
    try {
        const userId = req.user.id;

        let cart = await prisma.cart.findUnique({
            where: { userId },
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
            // Create an empty cart if one doesn't exist
            cart = await prisma.cart.create({
                data: { userId },
                include: { items: true },
            });
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
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/cart
 * Add an item to the cart.
 */
async function addToCart(req, res, next) {
    try {
        const userId = req.user.id;
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
        // PortSwigger – Business Logic Vulnerabilities

        // Get or create cart
        let cart = await prisma.cart.findUnique({ where: { userId } });
        if (!cart) {
            cart = await prisma.cart.create({ data: { userId } });
        }

        // VULNERABLE: Price manipulation — if the client sends a `price` field,
        // it is stored as the item price instead of the actual product price.
        // An attacker can set price=0.01 to buy expensive items cheaply.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Business Logic Vulnerabilities (Price manipulation)
        const itemPrice = price !== undefined ? parseFloat(price) : parseFloat(product.price);

        // Check if item already in cart
        const existingItem = await prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId,
                },
            },
        });

        let cartItem;
        if (existingItem) {
            // Update quantity
            cartItem = await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + parseInt(quantity, 10),
                    price: itemPrice, // price can be overwritten on each add
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
        const userId = req.user.id;
        const { itemId } = req.params;
        const { quantity, price } = req.body;

        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Valid quantity is required.',
            });
        }

        // VULNERABLE: IDOR — no check that the cart item belongs to the current user.
        // An attacker can modify another user's cart items by enumerating itemIds.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities (IDOR)
        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true },
        });

        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found.',
            });
        }

        // If quantity is 0, remove the item
        if (parseInt(quantity, 10) === 0) {
            await prisma.cartItem.delete({ where: { id: itemId } });
            return res.status(200).json({
                status: 'success',
                message: 'Item removed from cart.',
            });
        }

        const updatedItem = await prisma.cartItem.update({
            where: { id: itemId },
            data: {
                quantity: parseInt(quantity, 10),
                // VULNERABLE: Price can be modified on update too
                ...(price !== undefined && { price: parseFloat(price) }),
            },
            include: {
                product: { select: { id: true, title: true, price: true } },
            },
        });

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
        const userId = req.user.id;
        const { itemId } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const cartItem = await prisma.cartItem.findUnique({
            where: { id: itemId },
        });

        if (!cartItem) {
            return res.status(404).json({
                status: 'error',
                message: 'Cart item not found.',
            });
        }

        await prisma.cartItem.delete({ where: { id: itemId } });

        return res.status(200).json({
            status: 'success',
            message: 'Item removed from cart.',
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
};
