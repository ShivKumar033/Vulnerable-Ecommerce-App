I have a fully complete backend for an intentionally vulnerable e-commerce platform 
built with Node.js + Express + PostgreSQL + Prisma + JWT.

All features and vulnerabilities from master.md are already implemented in the backend.

Now I need to build the FRONTEND using:
- React (Vite)
- Tailwind CSS
- Axios
- Context API
- React Router (protected & role-based routes)

IMPORTANT RULES:
- Professional, modern, industry-level UI design
- Do NOT change or fix any backend API
- Match every backend endpoint exactly
- Preserve all intentional vulnerabilities on frontend side too
- Do not add client-side security fixes

Here is my master.md: @MASRTER.md
Here is my backend API structure / routes: /backend/src/routers/....

---

Now build the frontend SECTION BY SECTION in this order:

SECTION 1 - PROJECT SETUP & LAYOUT
- Vite + React + Tailwind setup
- Folder structure
- Global layout (Navbar, Footer, Sidebar)
- Auth context (JWT + cookie handling)
- Axios instance with interceptors
- Role-based route guards (User, Admin, Vendor, Support)
- Toast notifications

---

SECTION 2 - AUTHENTICATION PAGES
- Login page (email/password + Login with Google button)
- Register page
- Email verification page (mock)
- Password reset request & reset form page
- JWT token storage + refresh token logic

---

SECTION 3 - USER ACCOUNT PAGES
- Profile page (bio/display name - render unsanitized for SSTI)
- Multiple saved addresses (add/edit/delete)
- Order history page with search/filter
- Order tracking timeline page (visual steps)
- Wishlist page
- Loyalty points balance & history
- Store credit wallet page
- Gift card purchase & redemption page
- Saved payment methods (mock)
- Return/refund request & tracking page
- OAuth account linking page (Link Google Account)
- Account deletion request

---

SECTION 4 - PRODUCT & CATALOG PAGES
- Product listing page (search, filter, pagination, sorting)
- Product detail page (variants, images, reviews & ratings)
- Category/subcategory browse page
- Product review & rating submit form

---

SECTION 5 - CART & CHECKOUT PAGES
- Cart page (guest + logged in)
  - Apply coupon
  - Apply gift card
  - Apply store credit
  - Apply loyalty points
- Multi-step checkout flow:
  - Step 1: Address selection
  - Step 2: Shipping & tax summary
  - Step 3: Payment (mock Stripe)
  - Step 4: Order confirmation

---

SECTION 6 - ADMIN DASHBOARD
- Admin layout with sidebar
- User management (list, role assign, block/IP blacklist)
- Product moderation
- Order management
- Coupon/discount CRUD
- Refund approval/rejection panel
- Vendor approval & onboarding
- System health dashboard
- Report generation page (PDF/CSV download)
- Log file download
- Webhook destination URL config panel
- Backup download feature
- Inventory control
- Sales analytics

---

SECTION 7 - VENDOR DASHBOARD
- Vendor layout with sidebar
- Manage own products (CRUD)
- Bulk product upload via CSV
- Bulk product import via XML
- Add product images via URL
- View own orders
- Discount creation on own products
- Return request handling (approve/reject)
- Vendor profile page (bio/display name - unsanitized render)

---

SECTION 8 - SUPPORT DASHBOARD
- Support layout with sidebar
- Read-only orders & users view
- View loyalty points & store credit per user
- View coupon usage history
- View audit logs
- Add internal notes on orders
- Escalate orders to admin
- View IP blacklist (no edit)
- Search users & orders

---

SECTION 9 - INVOICE & ORDER DETAIL PAGES
- Invoice detail page with PDF download
- Order detail page with timeline
- Refund lifecycle status display

---

ADDITIONAL REQUIREMENTS:
- Preserve all XSS vulnerabilities (Stored, Reflected, DOM) on frontend
- Implement CSRF-vulnerable forms for address add/edit and order cancel
- OAuth flow must include vulnerable redirect_uri handling
- Guest cart must work without login
- Admin dashboard must include feature flags toggle UI
- Admin dashboard must include webhook test/trigger UI
- Expose publicly accessible static files directory link

---

Start with SECTION 1 only.
After I confirm it's done, move to SECTION 2, and so on.
Do not skip ahead.