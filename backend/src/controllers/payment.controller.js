import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────
// Payment Controller (Mock Stripe-style)
// ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payments/create-intent
 * Create a mock payment intent.
 * VULNERABLE: No idempotency key enforcement - can create multiple intents for same order
 * Maps to: OWASP A04:2021 – Insecure Design
 * PortSwigger – Business Logic Vulnerabilities
 */
async function createPaymentIntent(req, res, next) {
    try {
        const userId = req.user.id;
        const { orderId, amount } = req.body;

        if (!orderId) {
            return res.status(400).json({
                status: 'error',
                message: 'orderId is required.',
            });
        }

        // Find the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found.',
            });
        }

        // VULNERABLE: IDOR — no check that the order belongs to req.user
        // Anyone can create a payment intent for any order
        // Maps to: OWASP A01:2021 – Broken Access Control

        // VULNERABLE: Amount from client — can manipulate the amount
        // Maps to: OWASP A04:2021 – Insecure Design
        const intentAmount = amount !== undefined
            ? parseFloat(amount)
            : parseFloat(order.totalAmount);

        // Generate mock payment intent ID
        const paymentIntent = `pi_${crypto.randomBytes(16).toString('hex')}`;

        // Create payment record with PENDING status
        const payment = await prisma.payment.create({
            data: {
                orderId,
                amount: intentAmount,
                status: 'PENDING',
                paymentIntent,
                paymentMethod: 'card',
            },
        });

        await createAuditLog({
            userId,
            action: 'PAYMENT_INTENT_CREATED',
            entity: 'Payment',
            entityId: payment.id,
            metadata: {
                orderId,
                amount: intentAmount,
                paymentIntent,
            },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Payment intent created.',
            data: {
                paymentIntent,
                amount: intentAmount,
                currency: 'USD',
                status: 'requires_payment_method',
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/payments/confirm
 * Confirm a payment using a payment intent.
 * VULNERABLE: No proper payment intent status check - can confirm already confirmed payments
 * Maps to: OWASP A04:2021 – Insecure Design
 * PortSwigger – Business Logic Vulnerabilities
 */
async function confirmPayment(req, res, next) {
    try {
        const userId = req.user.id;
        const {
            paymentIntent,
            cardNumber,
            cardExpiry,
            cardCvc,
            cardName,
            saveCard,
        } = req.body;

        if (!paymentIntent) {
            return res.status(400).json({
                status: 'error',
                message: 'paymentIntent is required.',
            });
        }

        // Find the payment by intent
        const payment = await prisma.payment.findFirst({
            where: { paymentIntent },
            include: { order: true },
        });

        if (!payment) {
            return res.status(404).json({
                status: 'error',
                message: 'Payment intent not found.',
            });
        }

        // VULNERABLE: No ownership check - any user can confirm any payment
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities (IDOR)

        // VULNERABLE: Can confirm already completed payments - payment replay
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Business Logic Vulnerabilities

        // Mock payment processing — always succeeds for valid card format
        let paymentStatus = 'COMPLETED';
        if (cardNumber === '4000000000000002') {
            paymentStatus = 'FAILED';
        }

        // Update payment status
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: paymentStatus,
                paymentMethod: 'card',
                metadata: {
                    cardNumber,
                    cardExpiry,
                    cardCvc,
                    cardName,
                    confirmedAt: new Date().toISOString(),
                },
            },
        });

        // Update order status if payment succeeded
        if (paymentStatus === 'COMPLETED') {
            await prisma.order.update({
                where: { id: payment.orderId },
                data: { status: 'PAID' },
            });
        }

        // Optionally save the card for future use
        if (saveCard && cardNumber && paymentStatus === 'COMPLETED') {
            const last4 = cardNumber.slice(-4);
            let brand = 'unknown';
            if (cardNumber.startsWith('4')) brand = 'visa';
            else if (cardNumber.startsWith('5')) brand = 'mastercard';
            else if (cardNumber.startsWith('3')) brand = 'amex';

            await prisma.savedPaymentMethod.create({
                data: {
                    userId,
                    type: 'card',
                    last4,
                    brand,
                    expMonth: cardExpiry ? parseInt(cardExpiry.split('/')[0], 10) : null,
                    expYear: cardExpiry ? parseInt('20' + cardExpiry.split('/')[1], 10) : null,
                },
            });
        }

        await createAuditLog({
            userId,
            action: 'PAYMENT_CONFIRMED',
            entity: 'Payment',
            entityId: payment.id,
            metadata: {
                paymentIntent,
                status: paymentStatus,
            },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: paymentStatus === 'COMPLETED'
                ? 'Payment confirmed successfully.'
                : 'Payment failed.',
            data: {
                paymentIntent,
                status: paymentStatus,
                orderId: payment.orderId,
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/payments/charge
 * Mock payment processing — accepts card details, returns success/fail.
 */
async function chargePayment(req, res, next) {
    try {
        const userId = req.user.id;
        const {
            orderId,
            cardNumber,
            cardExpiry,
            cardCvc,
            cardName,
            amount,
            saveCard,
        } = req.body;

        if (!orderId) {
            return res.status(400).json({
                status: 'error',
                message: 'orderId is required.',
            });
        }

        // Find the order
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { payment: true },
        });

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found.',
            });
        }

        // VULNERABLE: IDOR — no check that the order belongs to req.user
        // Anyone can pay for (or replay payment on) any order.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities (IDOR)

        // VULNERABLE: Payment replay — no idempotency key or duplicate payment check.
        // An attacker can replay the same payment request multiple times.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Business Logic Vulnerabilities

        // VULNERABLE: Amount from client — the client can send a different amount
        // than the actual order total, paying less for an order.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Business Logic Vulnerabilities (Price manipulation)
        const chargeAmount = amount !== undefined
            ? parseFloat(amount)
            : parseFloat(order.totalAmount);

        // Generate mock payment intent ID
        const paymentIntent = `pi_${crypto.randomBytes(16).toString('hex')}`;

        // Mock payment processing — always succeeds for valid card format
        // (Simulate failure for specific test card numbers)
        let paymentStatus = 'COMPLETED';
        if (cardNumber === '4000000000000002') {
            paymentStatus = 'FAILED';
        }

        // Create or update payment record
        let payment;
        if (order.payment) {
            // VULNERABLE: Updating existing payment — allows status manipulation
            payment = await prisma.payment.update({
                where: { id: order.payment.id },
                data: {
                    amount: chargeAmount,
                    status: paymentStatus,
                    paymentIntent,
                    paymentMethod: 'card',
                    // VULNERABLE: Storing sensitive card data in metadata
                    // Maps to: OWASP A02:2021 – Cryptographic Failures
                    // PCI DSS violation — full card number in plain text
                    metadata: {
                        cardNumber,
                        cardExpiry,
                        cardCvc,
                        cardName,
                        chargedAt: new Date().toISOString(),
                    },
                },
            });
        } else {
            payment = await prisma.payment.create({
                data: {
                    orderId,
                    amount: chargeAmount,
                    status: paymentStatus,
                    paymentIntent,
                    paymentMethod: 'card',
                    metadata: {
                        cardNumber,
                        cardExpiry,
                        cardCvc,
                        cardName,
                        chargedAt: new Date().toISOString(),
                    },
                },
            });
        }

        // Update order status if payment succeeded
        if (paymentStatus === 'COMPLETED') {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: 'PAID' },
            });
        }

        // Optionally save the card for future use
        if (saveCard && cardNumber && paymentStatus === 'COMPLETED') {
            const last4 = cardNumber.slice(-4);
            let brand = 'unknown';
            if (cardNumber.startsWith('4')) brand = 'visa';
            else if (cardNumber.startsWith('5')) brand = 'mastercard';
            else if (cardNumber.startsWith('3')) brand = 'amex';

            await prisma.savedPaymentMethod.create({
                data: {
                    userId,
                    type: 'card',
                    last4,
                    brand,
                    expMonth: cardExpiry ? parseInt(cardExpiry.split('/')[0], 10) : null,
                    expYear: cardExpiry ? parseInt('20' + cardExpiry.split('/')[1], 10) : null,
                },
            });
        }

        // Audit log — VULNERABLE: logging full card details
        await createAuditLog({
            userId,
            action: 'PAYMENT_PROCESSED',
            entity: 'Payment',
            entityId: payment.id,
            metadata: {
                orderId,
                amount: chargeAmount,
                status: paymentStatus,
                paymentIntent,
                // VULNERABLE: Sensitive PII in audit log
                cardNumber,
                cardCvc,
            },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: paymentStatus === 'COMPLETED'
                ? 'Payment processed successfully.'
                : 'Payment failed.',
            data: {
                payment: {
                    id: payment.id,
                    paymentIntent,
                    amount: chargeAmount,
                    status: paymentStatus,
                    orderId,
                },
            },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * GET /api/v1/payments/:orderId
 * Get payment details for an order.
 */
async function getPaymentDetails(req, res, next) {
    try {
        const { orderId } = req.params;

        // VULNERABLE: IDOR — no ownership check
        // Maps to: OWASP A01:2021 – Broken Access Control
        const payment = await prisma.payment.findUnique({
            where: { orderId },
            include: {
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        status: true,
                        userId: true,
                    },
                },
            },
        });

        if (!payment) {
            return res.status(404).json({
                status: 'error',
                message: 'Payment not found for this order.',
            });
        }

        // VULNERABLE: Excessive data exposure — returning full payment metadata
        // which includes raw card numbers, CVC, etc.
        // Maps to: OWASP API3:2019 – Excessive Data Exposure
        return res.status(200).json({
            status: 'success',
            data: { payment },
        });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/payments/refund
 * Process a refund for an order's payment.
 */
async function refundPayment(req, res, next) {
    try {
        const { orderId, amount, reason } = req.body;

        if (!orderId) {
            return res.status(400).json({
                status: 'error',
                message: 'orderId is required.',
            });
        }

        const payment = await prisma.payment.findUnique({
            where: { orderId },
            include: { order: true },
        });

        if (!payment) {
            return res.status(404).json({
                status: 'error',
                message: 'Payment not found.',
            });
        }

        // VULNERABLE: Refund abuse — no check that the refund amount <= original amount
        // An attacker can issue a refund larger than the original payment.
        // Maps to: OWASP A04:2021 – Insecure Design
        // PortSwigger – Business Logic Vulnerabilities (Refund abuse)
        const refundAmount = amount !== undefined
            ? parseFloat(amount)
            : parseFloat(payment.amount);

        // VULNERABLE: No check that the requesting user is the order owner or admin
        // Maps to: OWASP A01:2021 – Broken Access Control

        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'REFUNDED',
                metadata: {
                    ...((payment.metadata) || {}),
                    refundedAt: new Date().toISOString(),
                    refundAmount,
                    refundReason: reason || 'No reason provided',
                },
            },
        });

        await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'PAYMENT_REFUNDED',
            entity: 'Payment',
            entityId: payment.id,
            metadata: { orderId, refundAmount, reason },
            req,
        });

        return res.status(200).json({
            status: 'success',
            message: 'Refund processed.',
            data: {
                refundAmount,
                paymentStatus: 'REFUNDED',
                orderStatus: 'CANCELLED',
            },
        });
    } catch (error) {
        next(error);
    }
}

export {
    createPaymentIntent,
    confirmPayment,
    chargePayment,
    getPaymentDetails,
    refundPayment,
};
