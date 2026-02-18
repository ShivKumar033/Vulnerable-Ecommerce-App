import { prisma } from '../config/db.js';

// ──────────────────────────────────────────────────────────────
// Audit Log Utility
// ──────────────────────────────────────────────────────────────

/**
 * Persist an audit log entry.  Fire-and-forget — errors are logged
 * but never propagated so they don't break the calling flow.
 *
 * @param {object} params
 * @param {string}  [params.userId]   - Acting user ID
 * @param {string}   params.action    - e.g. 'LOGIN', 'ORDER_CREATED'
 * @param {string}  [params.entity]   - e.g. 'User', 'Order'
 * @param {string}  [params.entityId] - ID of affected entity
 * @param {object}  [params.metadata] - Extra data (request body, etc.)
 * @param {object}  [params.req]      - Express request (to pull IP + UA)
 */
async function createAuditLog({ userId, action, entity, entityId, metadata, req }) {
    try {
        // VULNERABLE: Excessive data exposure in audit logs — stores full request body
        // including sensitive fields like passwords, tokens, card numbers.
        // Maps to: OWASP A03:2021 – Injection (CSV injection in exported logs)
        // PortSwigger – Information Disclosure
        await prisma.auditLog.create({
            data: {
                userId: userId || null,
                action,
                entity: entity || null,
                entityId: entityId || null,
                metadata: metadata || null,
                ipAddress: req ? (req.headers['x-forwarded-for'] || req.ip) : null,
                userAgent: req ? req.headers['user-agent'] : null,
            },
        });
    } catch (err) {
        console.error('Audit log write failed:', err.message);
    }
}

export { createAuditLog };
