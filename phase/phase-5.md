# 🔴 Prompt 5.1 – Authorization & IDOR

Follow docs/MASTER_PROMPT.md exactly.

Intentionally weaken authorization:
- IDOR in profiles, orders, invoices
- missing role checks
- mass assignment

Add // VULNERABLE comments.

# 🔴 Prompt 5.2 – Business Logic Flaws

Follow docs/MASTER_PROMPT.md exactly.

Introduce business logic vulnerabilities:
- price manipulation
- negative quantity
- coupon reuse
- refund abuse

# 🔴 Prompt 5.3 – Race Conditions

Follow docs/MASTER_PROMPT.md exactly.

Modify checkout and stock reservation logic
to introduce race conditions and double-spend issues.

Do NOT use transactions or locks.

# 🔴 Prompt 5.4 – Webhook Forgery

Follow docs/MASTER_PROMPT.md exactly.

Modify webhook logic:
- trust payload blindly
- weak or no signature verification
- no replay protection


# 🔴 Prompt 5.5 – Legacy API Abuse

Follow docs/MASTER_PROMPT.md exactly.

Create /api/v2 endpoints
that lack authorization, validation, and rate limiting.


# 🔴 Prompt 5.5 – Legacy API Abuse

Follow docs/MASTER_PROMPT.md exactly.

Create /api/v2 endpoints
that lack authorization, validation, and rate limiting.


# 🔴 Prompt 5.6 – SSRF

Follow docs/MASTER_PROMPT.md exactly.

Introduce SSRF via:
- image URL fetching
- PDF invoice generation
- webhook destination URL

No URL allowlist or filtering.
