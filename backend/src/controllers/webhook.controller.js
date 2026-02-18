import { prisma } from '../config/db.js';
import { createAuditLog } from '../utils/auditLog.js';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

// ──────────────────────────────────────────────────────────────
// Webhook Controller
// Covers: Payment & Order webhook receiving, webhook config mgmt
// ──────────────────────────────────────────────────────────────

// VULNERABLE: Weak shared secret for webhook signature verification
// Maps to: OWASP A02:2021 – Cryptographic Failures
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'webhook_secret_123';

/**
 * POST /api/v1/webhooks/payment
 * Receive payment webhook notifications.
 * VULNERABLE: Weak signature verification, no replay protection,
 * trusts webhook payload blindly.
 * Maps to: OWASP A04:2021 – Insecure Design
 * PortSwigger – Business Logic Vulnerabilities
 */
async function paymentWebhook(req, res, next) {
    try {
        const signature = req.headers['x-webhook-signature'];
        const payload = req.body;

        // VULNERABLE: Weak signature verification — HMAC with trivial secret
        // and the check can be bypassed by not sending a signature at all
        // Maps to: OWASP A02:2021 – Cryptographic Failures
        if (signature) {
            const expectedSig = crypto
                .createHmac('sha256', WEBHOOK_SECRET)
                .update(JSON.stringify(payload))
                .digest('hex');

            if (signature !== expectedSig) {
                // VULNERABLE: Logs the expected signature — information disclosure
                console.log(`Webhook signature mismatch. Expected: ${expectedSig}, Got: ${signature}`);
                // Don't reject — process anyway (intentionally vulnerable)
            }
        }
        // VULNERABLE: No signature = no verification at all

        // VULNERABLE: No replay protection — no timestamp check, no nonce tracking
        // Maps to: PortSwigger – Business Logic Vulnerabilities

        const { event, data } = payload;

        if (!event || !data) {
            return res.status(400).json({ status: 'error', message: 'event and data are required.' });
        }

        // VULNERABLE: Trusts webhook payload blindly — updates order/payment status
        // based entirely on the incoming payload with no server-side verification
        // Maps to: OWASP A04:2021 – Insecure Design
        switch (event) {
            case 'payment.completed': {
                if (data.orderId) {
                    await prisma.order.update({
                        where: { id: data.orderId },
                        data: { status: 'PAID' },
                    }).catch(() => { });

                    if (data.paymentIntent) {
                        await prisma.payment.updateMany({
                            where: { paymentIntent: data.paymentIntent },
                            data: { status: 'COMPLETED' },
                        }).catch(() => { });
                    }
                }
                break;
            }
            case 'payment.failed': {
                if (data.orderId) {
                    await prisma.order.update({
                        where: { id: data.orderId },
                        data: { status: 'CANCELLED' },
                    }).catch(() => { });

                    if (data.paymentIntent) {
                        await prisma.payment.updateMany({
                            where: { paymentIntent: data.paymentIntent },
                            data: { status: 'FAILED' },
                        }).catch(() => { });
                    }
                }
                break;
            }
            case 'payment.refunded': {
                if (data.orderId) {
                    await prisma.payment.updateMany({
                        where: { orderId: data.orderId },
                        data: { status: 'REFUNDED' },
                    }).catch(() => { });

                    await prisma.order.update({
                        where: { id: data.orderId },
                        data: { status: 'CANCELLED' },
                    }).catch(() => { });
                }
                break;
            }
            case 'order.shipped': {
                if (data.orderId) {
                    await prisma.order.update({
                        where: { id: data.orderId },
                        data: { status: 'SHIPPED' },
                    }).catch(() => { });
                }
                break;
            }
            case 'order.delivered': {
                if (data.orderId) {
                    await prisma.order.update({
                        where: { id: data.orderId },
                        data: { status: 'DELIVERED' },
                    }).catch(() => { });
                }
                break;
            }
            default:
                console.log(`Unknown webhook event: ${event}`);
        }

        // Dispatch to registered webhook endpoints
        await dispatchToRegistered(event, data);

        // Audit log
        await createAuditLog({
            action: 'WEBHOOK_RECEIVED',
            entity: 'Webhook',
            metadata: { event, data, signature },
        });

        return res.status(200).json({
            status: 'success',
            message: 'Webhook processed.',
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Dispatch webhook event to all registered webhook endpoints.
 * VULNERABLE: SSRF — fetches user-configurable URLs without validation
 * Maps to: OWASP A10:2021 – Server-Side Request Forgery
 * PortSwigger – SSRF
 */
async function dispatchToRegistered(event, data) {
    try {
        const configs = await prisma.webhookConfig.findMany({
            where: {
                isActive: true,
                events: { has: event },
            },
        });

        for (const config of configs) {
            try {
                // VULNERABLE: SSRF — no validation on config.url
                // Admin can set webhook URL to internal services
                // Maps to: OWASP A10:2021 – Server-Side Request Forgery
                const sender = config.url.startsWith('https') ? https : http;
                const urlObj = new URL(config.url);

                const postData = JSON.stringify({ event, data, timestamp: Date.now() });

                const sig = config.secret
                    ? crypto.createHmac('sha256', config.secret).update(postData).digest('hex')
                    : '';

                const options = {
                    hostname: urlObj.hostname,
                    port: urlObj.port,
                    path: urlObj.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                        'X-Webhook-Signature': sig,
                    },
                };

                const req = sender.request(options, (res) => {
                    // fire and forget
                });
                req.on('error', (err) => {
                    console.error(`Webhook dispatch to ${config.url} failed:`, err.message);
                });
                req.write(postData);
                req.end();
            } catch (dispatchErr) {
                console.error(`Webhook dispatch error:`, dispatchErr.message);
            }
        }
    } catch (err) {
        console.error('Webhook dispatch lookup error:', err.message);
    }
}

// ═══════════════════════════
// WEBHOOK CONFIG MANAGEMENT
// ═══════════════════════════

/**
 * GET /api/v1/webhooks/configs
 */
async function listWebhookConfigs(req, res, next) {
    try {
        const configs = await prisma.webhookConfig.findMany({ orderBy: { createdAt: 'desc' } });

        // VULNERABLE: Exposing webhook secrets in response
        // Maps to: OWASP A02:2021 – Cryptographic Failures
        return res.status(200).json({ status: 'success', data: { webhookConfigs: configs } });
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/v1/webhooks/configs
 */
async function createWebhookConfig(req, res, next) {
    try {
        const { url, events, secret } = req.body;

        if (!url || !events || !Array.isArray(events)) {
            return res.status(400).json({
                status: 'error',
                message: 'url and events (array) are required.',
            });
        }

        // VULNERABLE: SSRF — admin-configurable URL with no validation
        // Maps to: OWASP A10:2021 – Server-Side Request Forgery
        const config = await prisma.webhookConfig.create({
            data: {
                url,
                events,
                secret: secret || null,
            },
        });

        await createAuditLog({
            userId: req.user.id,
            action: 'WEBHOOK_CONFIG_CREATED',
            entity: 'WebhookConfig',
            entityId: config.id,
            metadata: { url, events },
            req,
        });

        return res.status(201).json({ status: 'success', message: 'Webhook config created.', data: { webhookConfig: config } });
    } catch (error) {
        next(error);
    }
}

/**
 * PUT /api/v1/webhooks/configs/:id
 */
async function updateWebhookConfig(req, res, next) {
    try {
        const { id } = req.params;
        const { url, events, secret, isActive } = req.body;

        const config = await prisma.webhookConfig.update({
            where: { id },
            data: {
                ...(url !== undefined && { url }),
                ...(events !== undefined && { events }),
                ...(secret !== undefined && { secret }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return res.status(200).json({ status: 'success', message: 'Webhook config updated.', data: { webhookConfig: config } });
    } catch (error) {
        next(error);
    }
}

/**
 * DELETE /api/v1/webhooks/configs/:id
 */
async function deleteWebhookConfig(req, res, next) {
    try {
        const { id } = req.params;
        await prisma.webhookConfig.delete({ where: { id } });
        return res.status(200).json({ status: 'success', message: 'Webhook config deleted.' });
    } catch (error) {
        next(error);
    }
}

export {
    paymentWebhook,
    listWebhookConfigs,
    createWebhookConfig,
    updateWebhookConfig,
    deleteWebhookConfig,
};
