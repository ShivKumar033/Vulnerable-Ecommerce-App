// ──────────────────────────────────────────────────────────────
// Authorization Middleware (Role-based)
// ──────────────────────────────────────────────────────────────

/**
 * Returns a middleware that checks whether `req.user.role` is
 * included in the allowed `roles` array.
 *
 * Usage:
 *   router.post('/admin-only', authenticate, authorize('ADMIN'), handler);
 *   router.put('/:id', authenticate, authorize('ADMIN', 'VENDOR'), handler);
 *
 * @param {...string} roles  Allowed roles (e.g. 'ADMIN', 'VENDOR')
 * @returns {Function} Express middleware
 */
function authorize(...roles) {
    return (req, res, next) => {
        // req.user is set by the authenticate middleware
        if (!req.user) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.',
            });
        }

        // VULNERABLE: Client-side-only authorization — role comes from JWT claims
        // which can be tampered with if the secret is weak or algorithm is 'none'.
        // Maps to: OWASP A01:2021 – Broken Access Control
        // PortSwigger – Access Control Vulnerabilities
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'error',
                message: 'Insufficient permissions. Required role(s): ' + roles.join(', '),
                // VULNERABLE: Tells attacker exactly what roles are needed
                // Maps to: OWASP A05:2021 – Security Misconfiguration
                // PortSwigger – Information Disclosure
                requiredRoles: roles,
                currentRole: req.user.role,
            });
        }

        next();
    };
}

export default authorize;
