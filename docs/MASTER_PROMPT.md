You are a senior full-stack engineer, software architect,
and professional penetration tester.

Build a FULLY FUNCTIONAL, INDUSTRY-LEVEL E-COMMERCE PLATFORM
using a MONOLITHIC ARCHITECTURE (NOT microservices).

This application is INTENTIONALLY VULNERABLE and designed for:
- Penetration testing
- Bug bounty practice
- Security training labs
- DevSecOps validation
- Technical interviews

--------------------------------------------------
TECH STACK (MANDATORY)
--------------------------------------------------
Backend:
- Node.js + Express.js (monolith)
- PostgreSQL (Prisma)
- JWT Access Tokens + Refresh Tokens + Cookie
- Multer for file uploads
- Redis (optional, but recommended for cart/session)

Frontend:
- React (Vite & Tailwind CSS)
- Axios
- Context API
- Protected & role-based routes

--------------------------------------------------
CORE E-COMMERCE FUNCTIONALITY (NO SIMPLIFICATION)
--------------------------------------------------

1. AUTHENTICATION & AUTHORIZATION
- User registration and login
- Password hashing (bcrypt)
- JWT access + refresh tokens
- Role-based access control:
  - User
  - Admin
  - Vendor (seller)
  - Support (read-only)
- Email verification (mock)
- Password reset flow (mock)

2. USER ACCOUNT MANAGEMENT
- Each Roles have own dashboard (User, Admin, Vendor, Support)
- Profile update
- Multiple saved addresses
- Order history
- Wishlist
- Saved payment methods (mock)
- and other features

3. PRODUCT & CATALOG SYSTEM
- Product CRUD (admin/vendor)
- Category & sub-category hierarchy
- Product variants (size, color)
- Product images upload
- Product reviews & ratings
- Advanced search:
  - keyword
  - price range
  - category
  - rating
- Pagination and sorting
- and other features

4. SHOPPING CART & INVENTORY LOGIC
- Persistent cart (DB or Redis)
- Real-time stock validation
- Stock reservation during checkout
- Stock release on timeout or cancellation
- Allow concurrency issues intentionally
- and other features

5. CHECKOUT, ORDERS & PAYMENTS
- Multi-step checkout flow
- Address selection
- Coupon application
- Tax and shipping calculation
- Order lifecycle:
  - Pending
  - Paid
  - Shipped
  - Delivered
  - Cancelled
- Mock Stripe-style payment flow:
  - payment intent
  - payment confirmation
  - webhook simulation
- and other features

6. ADMIN & VENDOR DASHBOARDS
- Admin dashboard:
  - user management
  - order management
  - product moderation
  - inventory control
  - basic sales analytics
  - and other advance feature
- Vendor dashboard:
  - manage own products
  - view own orders
  - and other features
- Support dashboard:
  - read-only order & user access
  - and other features

7. ADVANCED INDUSTRY FEATURES (MANDATORY)
- Webhooks (payment & order updates)
- Invoice & PDF generation
- CSV import/export (products, orders)
- Bulk admin operations
- Feature flags & runtime configuration toggles
- Audit logging (intentionally verbose)
- and other features

8. OAUTH / SOCIAL LOGIN (MANDATORY)
- Implement OAuth login with:
  - Google
- OAuth flow must include:
  - Login
  - Account linking
  - Auto-registration
- Support both email/password and OAuth accounts
- Store OAuth provider ID and email mapping
- OAuth users should have roles like normal users
- Frontend must support "Login with Google"
- and other features

9. HIGH-VALUE REAL-WORLD FEATURES
- Email workflows:
  - Order confirmation emails (mock)
  - Password reset emails
- Export functionality:
  - Export orders/users as CSV
- Activity & audit logs:
  - Login events
  - Order actions
  - Admin actions
- Publicly accessible static files directory
- and other features

--------------------------------------------------
INTENTIONAL SECURITY VULNERABILITIES (MANDATORY)
--------------------------------------------------

Implement AT LEAST 35 REALISTIC SECURITY VULNERABILITIES.

Each vulnerability must:
- Be exploitable
- Not break core functionality
- Be commented clearly in code
- Map to OWASP Web or API Top 10

OAUTH / SOCIAL LOGIN VULNERABILITIES

- OAuth misconfiguration allowing account takeover
- Missing state parameter validation (CSRF in OAuth)
- Email trust issue (attacker registers same email)
- OAuth token not verified against provider
- Insecure OAuth callback handling
- OAuth account linking without re-authentication
- Ability to bind OAuth account to existing victim account

--------------------------------------------------
ADVANCED INDUSTRY FEATURES (MANDATORY)
--------------------------------------------------
Add the following features in a REALISTIC, production-style way:

1. RACE CONDITION-PRONE WORKFLOWS
- Double-Spend on Wallet / Store Credit
- Coupon Reuse Race Condition
- Multiple Order Placement for Single Payment
- Inventory Overselling (Stock Depletion Race)
- Refund Issued Multiple Times
- Loyalty Points Double Credit
- Gift Card Balance Race Condition
- Concurrent checkout flow
- Stock reservation race condition
- Order creation without proper transaction locking
- Allow double-spend scenarios under high concurrency

2. WEBHOOK SYSTEM (PAYMENT & ORDER)
- `/api/v1/webhooks/payment`
- Weak signature verification
- No replay protection
- Trust webhook payload blindly

3. LEGACY API VERSIONS
- Maintain `/api/v1` and `/api/v2`
- `/api/v2` missing:
  - authorization checks
  - input validation
  - rate limiting
- Legacy endpoints must still be functional

4. SERVER-SIDE REQUEST FORGERY (SSRF)
- Product image fetch via URL
- Invoice PDF generation using remote resources
- Webhook destination URL configurable by admin
- No allowlist or URL validation

--------------------------------------------------
REQUIRED VULNERABILITY CATEGORIES
--------------------------------------------------

AUTHENTICATION & SESSION
- Weak JWT secret
- JWT claim tampering
- Algorithm confusion
- Token reuse
- Account enumeration
- Password reset token reuse

AUTHORIZATION (IDOR / BOLA / PRIV ESC)
- IDOR in profiles, orders, invoices
- Vendor horizontal privilege escalation
- Missing role checks
- Mass assignment
- Client-side-only authorization

INPUT VALIDATION & XSS
- Stored XSS
- Reflected XSS
- DOM XSS
- HTML injection

INJECTION
- SQL injection
- Blind SQL injection
- CSV injection

FILE HANDLING
- Unrestricted file upload
- MIME bypass
- Web shell upload

BUSINESS LOGIC
- Price manipulation
- Coupon reuse
- Payment replay
- Order status tampering
- Refund abuse
- Race condition in checkout

API & CONFIGURATION
- Excessive data exposure
- Missing rate limiting
- CORS misconfiguration
- Debug mode enabled
- Missing security headers

SSRF & INTERNAL ACCESS
- Image fetch SSRF
- Webhook SSRF

--------------------------------------------------
PORTSWIGGER WEB SECURITY ACADEMY COVERAGE (MANDATORY)
--------------------------------------------------

In addition to previously defined vulnerabilities, the application
MUST intentionally implement vulnerabilities covering ALL major
PortSwigger Web Security Academy categories.

The goal is to make this project a ONE-STOP platform for practicing
PortSwigger-style labs in a real e-commerce environment.

--------------------------------------------------
REQUIRED PORTSWIGGER VULNERABILITY CATEGORIES
--------------------------------------------------

• SQL Injection
• Authentication vulnerabilities
• Session management flaws
• Access control vulnerabilities
• Business logic vulnerabilities
• Information disclosure
• File upload vulnerabilities
• OS command injection
• Server-Side Request Forgery (SSRF)
• Cross-Site Scripting (XSS)
  - Reflected
  - Stored
  - DOM-based
• Cross-Site Request Forgery (CSRF)
• Clickjacking
• Cross-Origin Resource Sharing (CORS) misconfiguration
• XML External Entity (XXE) injection
• Server-side template injection (SSTI)
• Insecure deserialization
• Web cache poisoning
• HTTP request smuggling (logical simulation)
• OAuth authentication vulnerabilities
• Webhook vulnerabilities
• Host header injection
• Open redirect
• JWT vulnerabilities
• Race conditions
• API security flaws (BOLA, excessive data exposure)

--------------------------------------------------
IMPLEMENTATION REQUIREMENTS
--------------------------------------------------

- Each PortSwigger vulnerability must:
  - Exist in a REALISTIC e-commerce flow
  - Be exploitable using Burp Suite-style techniques
  - Be clearly commented in code:
    // VULNERABLE: PortSwigger - <category>

- Vulnerabilities should be distributed across:
  - Authentication
  - Checkout
  - Orders
  - Payments
  - Admin panel
  - APIs
  - File handling
  - Webhooks

--------------------------------------------------
TARGET
--------------------------------------------------

Total vulnerabilities after this addition:
✔ 45–55 real-world vulnerabilities
✔ Covers OWASP Web + API Top 10
✔ Covers PortSwigger Web security all-labs


--------------------------------------------------
IMPLEMENTATION RULES
--------------------------------------------------
- Do NOT auto-fix vulnerabilities and Must not break functionality
- Vulnerabilities must look accidental, exploitable and realistic
- Comment vulnerable code as:
  // VULNERABLE: <description>
- App must function normally

--------------------------------------------------
PROJECT STRUCTURE (MANDATORY)
--------------------------------------------------

Update my existing project to this structure:

backend/
├── src/
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middlewares/
│   ├── utils/
│   ├── app.js
│   └── server.js

frontend/
├── src/
│   ├── api/
│   ├── components/
│   ├── pages/
│   ├── context/
│   ├── routes/
│   ├── App.jsx
│   └── main.jsx

--------------------------------------------------
DOCUMENTATION (REQUIRED)
--------------------------------------------------
- README.md (architecture & usage)
- attack-chain.md (step-by-step exploitation)
- vulnerability-list.md:
  ID | Vulnerability | Endpoint | Impact | OWASP | Fix

--------------------------------------------------
OUTPUT REQUIREMENTS
--------------------------------------------------
- Full backend code + Full frontend code
- Sample environment variables
- Sample test accounts (admin, vendor, user)
- Example API requests (curl)

--------------------------------------------------
IMPORTANT
--------------------------------------------------
- DO NOT use microservices
- DO NOT silently fix vulnerabilities
- This application is INTENTIONALLY INSECURE
- For authorized security testing only
