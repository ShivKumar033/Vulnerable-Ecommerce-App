# 🔴 Prompt 5.1 – Authorization & IDOR

Follow docs/MASTER_PROMPT.md exactly.

Intentionally weaken authorization:
- IDOR in profiles, orders, invoices
- missing role checks
- mass assignment
- Broken Object Level Authorization (BOLA / IDOR)
- Broken Function Level Authorization (BFLA)
- Insecure Direct Object References (IDOR)
- Missing Authorization Checks
- Privilege Escalation
- Horizontal Privilege Escalation
- Vertical Privilege Escalation
- Role-Based Access Control (RBAC) Bypass
- Attribute-Based Access Control (ABAC) Bypass
- Forced Browsing
- Parameter Tampering
- Authorization Token Manipulation
- JWT Claim Tampering
- Predictable Object Identifiers
- Authorization via Client-Side Controls
- Broken Access Control
- Improper Multi-Tenant Isolation
- API Endpoint Authorization Bypass
- ID Enumeration Attacks

Add // VULNERABLE comments.

# 🔴 Prompt 5.2 – Business Logic Flaws

Follow docs/MASTER_PROMPT.md exactly.

Introduce business logic vulnerabilities:
- negative quantity
- coupon reuse
- refund abuse
- Catalog Browsing Flow
- Search & Filtering Flow
- Pricing & Discount Application Flow
- Cart Management Flow
- Checkout Flow
- Payment Processing Flow
- Order Placement Flow
- Order Fulfillment Flow
- Shipping & Delivery Flow
- Returns & Refunds Flow
- Subscription & Recurring Billing Flow
- Inventory Management Flow
- Promotion & Coupon Redemption Flow
- Loyalty & Rewards Flow
- Customer Support & Ticketing Flow

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
- Unauthorized Order Status Update
- Duplicate Payment Notification Replay
- Fake Shipment Confirmation
- Fake Delivery Confirmation
- Fake Return Confirmation
- Fake Refund Confirmation

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
