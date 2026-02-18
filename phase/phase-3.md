# Phase 3: Core Backend Logic (Features)

**Objective:** Implement the core business logic and API endpoints *without* intentional vulnerabilities first (unless fundamental architecturally).

## 3.1 Authentication & Authorization
**Reference:** `MASTER_PROMPT.md` -> Core Functionality #1 & #3

1.  **Auth Utilities:**
    -   Implement `utils/password.js`: `hashPassword` and `comparePassword` using `bcrypt`.
    -   Implement `utils/jwt.js`: `generateToken` and `verifyToken`.

2.  **Auth Controllers & Routes (`/api/auth`):**
    -   `POST /register`: Create user.
    -   `POST /login`: Verify credentials, issue JWT (access + refresh).
    -   `POST /refresh-token`: Re-issue tokens.
    -   `POST /logout`: Clear cookies/tokens.

3.  **Middleware:**
    -   `authenticate`: Verify JWT from header/cookie.
    -   `authorize(...roles)`: Check user role.

## 3.2 Product Management
**Reference:** `MASTER_PROMPT.md` -> Core Functionality #3

1.  **Endpoints (`/api/products`):**
    -   `GET /`: List products (pagination, filter, sort).
    -   `GET /:id`: Product details.
    -   `POST /`: Create product (Vendor/Admin only).
    -   `PUT /:id`: Update product (Vendor owner/Admin only).
    -   `DELETE /:id`: Delete product.

2.  **File Upload:**
    -   Configure `multer` for product image uploads.
    -   Store files in a public directory or simplistic cloud storage mock.

## 3.3 Cart & Orders
**Reference:** `MASTER_PROMPT.md` -> Core Functionality #4 & #5

1.  **Cart (`/api/cart`):**
    -   `GET /`: View cart.
    -   `POST /`: Add item.
    -   `PUT /:itemId`: Update quantity.
    -   `DELETE /:itemId`: Remove item.

2.  **Orders (`/api/orders`):**
    -   `POST /checkout`: Convert cart to order, deduct stock (simple logic for now).
    -   `GET /`: List user orders.
    -   `GET /:id`: Order details.

3.  **Admin/Vendor Orders:**
    -   Admin views all orders.
    -   Vendor views orders containing their products.

## 3.4 Payments (Mock)
**Reference:** `MASTER_PROMPT.md` -> Core Functionality #5

-   Implement specific endpoints to simulate payment processing:
    -   `POST /api/payment/charge`: Accepts card details (mock), returns success/fail.
