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
- JWT access + refresh tokens and also use cookie for someworks.
- Role-based access control:
  - User
  - Admin
  - Vendor (seller)
  - Support (read-only)
- Email verification (mock)
- Password reset flow (mock)

2. USER ACCOUNT MANAGEMENT 
- Loyalty points balance & history (earn on purchase, view log)
- Store credit wallet (add, deduct,balance, usage history)
- Gift card purchase & redemption
- Return/refund request flow (submit, track status)
- Order tracking timeline page (visual status steps)
- Saved payment methods (mock)
- OAuth account linking ("Link Google Account")
- Profile with bio/display name fields (template-rendered)
- Each Roles have own dashboard (User, Admin, Vendor, Support)
- Account deletion request
- Profile update
- Multiple saved addresses
- Order history
- Wishlist
- and other features

3. PRODUCT & CATALOG SYSTEM
- Product CRUD (admin/vendor)
- Category & sub-category hierarchy
- Product variants (size, color)
- Product image add via URL (not just file upload)
- Product XML import (admin/vendor UI)
- Product CSV import/export (admin/vendor UI)
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
- Coupon usage tracking with per-user limit enforcement
- Gift card balance check & redemption at cart
- Store credit apply at cart
- Loyalty points redemption at cart
- Persistent cart (DB or Redis)
- Real-time stock validation
- Stock reservation during checkout
- Stock release on timeout or cancellation
- Allow concurrency issues intentionally
- Guest cart (no login required)
- and other features

5. CHECKOUT, ORDERS & PAYMENTS
- Refund request, approval & payout flow
- Refund lifecycle: Requested → Approved → Refunded
- Invoice detail page with PDF download per order
- Order history page with search/filter query parameter
- Address add/edit form (with unsanitized field rendering)
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
  - payment intent creation endpoint 
  - payment confirmation endpoint
  - webhook simulation endpoint
- and other features

6. ADMIN & VENDOR DASHBOARDS
- Admin dashboard:
  - Coupon/discount CRUD (create, edit, delete, toggle active)
  - Refund approval/rejection (approve or deny vendor/user requests)
  - Vendor approval & onboarding (approve new vendor registrations)
  - System health dashboard (DB status, Redis, uptime, error rate)
  - IP blacklist / block users (block by IP or user account)
  - Role assignment panel (change user roles from UI)
  - Report generation page (sales, user, order PDF/CSV)
  - Log file download feature
  - Webhook destination URL configuration panel
  - Backup download feature
  - user management
  - order management
  - product moderation
  - inventory control
  - basic sales analytics
  - and other advance feature
- Vendor dashboard:
  - Bulk product upload via CSV
  - Bulk product import via XML
  - Discount creation on own products
  - Return request handling (approve/reject return requests)
  - Vendor profile page with bio/display name (template-rendered)
  - manage own products
  - view own orders
  - and other features
- Support dashboard:
  - Read-only access to orders, users, returns, refunds
  - View customer loyalty points & store credit balance
  - View coupon usage history
  - View audit logs
  - Add internal notes/comments on orders
  - Escalate flagged orders to admin
  - View IP blacklist (no edit access)
  - Search users & orders
  - read-only order & user access
  - and other features

7. ADVANCED INDUSTRY FEATURES (MANDATORY)
- Gift card generation & redemption system
- Store credit issuance & deduction logic
- Loyalty points engine (earn rules, redemption, expiry)
- Return/refund lifecycle (Requested → Approved → Refunded)
- Webhooks (payment & order updates)
- Webhook destination URL configurable by admin
- OS command-based backup & log download (admin)
- OS command-based report generation (PDF/CSV)
- Invoice PDF generation with remote resource fetch
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
- Account linking UI ("Link Google Account" in user settings)
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
REQUIRED VULNERABILITY CATEGORIES (MANDATORY)
--------------------------------------------------
Add the following features in a REALISTIC, production-style way:

Implementing Rules:
- Each Vulnerabilites must Be Exploitable
- Do NOT auto-fix vulnerabilities and Must not break core functionality
- Vulnerabilities must look accidental, exploitable and realistic
- Comment vulnerable code as:
  // VULNERABLE: very short <description>
- App must be working functionaly normally
- Do not add any extra comments or explanations

  
1. AUTHENTICATION & AUTHORIZATION & SESSION
- Session management flaws
- JWT claim tampering
- Password reset token reuse ( and also have Host header injection vulnerability )
- IDOR in orders, invoices, address
- missing role checks
- mass assignment
- Vendor horizontal privilege escalation
- Vertical Privilege Escalation (Vendor -> Admin) (Support -> Vendor) (Support -> Admin)

2. CROSS-SITE SCRIPTING (XSS)
- Stored XSS (in product reviews)
- Reflected XSS (in address section only for 1 address fields)
- DOM XSS (in client-side code that handles user input)

3. INJECTION VULNERABILITIES
- SQL injection (in invoice) (in product delete) (in product update) 
- Blind SQL injection (in order history)
- Server-Side Template Injection (SSTI) (in user profile) (in vendor profile)

4. FILE UPLOAD VULNERABILITIES (MANDATORY)
- Unrestricted file upload (in product image) 
- MIME bypass (in product image)

5. OAUTH / SOCIAL LOGIN VULNERABILITIES
- OAuth misconfiguration allowing account takeover
- Email trust issue (attacker registers same email)
- OAuth account linking without re-authentication
- redirect_uri validation bypass in OAuth flows

6. RACE CONDITION-PRONE WORKFLOWS
- Double-Spend on Store Credit and double-add store credit (double-add is must)
- Coupon Reuse Race Condition
- Multiple Order Placement for Single Payment
- Inventory Overselling (Stock Depletion Race)
- Refund Issued Multiple Times
- Loyalty Points Double Credit
- Gift Card Balance Race Condition
- Order creation without proper transaction locking
- Allow double-spend scenarios under high concurrency

7. WEBHOOK SYSTEM (PAYMENT & ORDER)
- `/api/v1/webhooks/payment`
- Trust webhook payload blindly
- no replay protection
- Unauthorized Order Status Update
- Duplicate Payment Notification Replay
- Fake Shipment Confirmation
- Fake Return Confirmation
- Fake Refund Confirmation

8. BUSINESS LOGIC
- Payment replay (in checkout)

9. API & CONFIGURATION
- Missing rate limiting 
- CORS misconfiguration 
- Maintain `/api/v1` and `/api/v2` Vulnerable API 

10. SSRF & INTERNAL ACCESS
- Webhook SSRF
- Product image fetch via URL
- Invoice PDF generation using remote resources
- Webhook destination URL configurable by admin
- No allowlist or URL validation

11. OS command injection ( In Admin Panel with Backup / log download features) ( Report generation (PDF/CSV))
12. Cross-Site Request Forgery (CSRF) ( Implement in Add / edit address and Cancel order)
13. XML External Entity (XXE) injection ( In product import feature ) 

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
