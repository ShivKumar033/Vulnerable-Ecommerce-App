# Phase 2: Database Design & Implementation

**Objective:** Set up the database, define models, and verify connectivity.

## 2.1 Database Setup
**Reference:** `MASTER_PROMPT.md` -> Tech Stack (PostgreSQL + Prisma)

1.  **Prisma Initialization:**
    -   Install Prisma: `npm install prisma --save-dev`.
    -   Install Prisma Client: `npm install @prisma/client`.
    -   Initialize Prisma: `npx prisma init`.

2.  **Define Schema (`prisma/schema.prisma`):**
    Based on `MASTER_PROMPT.md` -> Core Functionality, define the following models:
    -   **User**: `id`, `email`, `password` (hashed), `role` (User, Admin, Vendor, Support), `profile` fields.
    -   **Product**: `id`, `title`, `description`, `price`, `stock`, `vendorId` (relation to User), `categoryId`.
    -   **Category**: `id`, `name`, `parentId` (for hierarchy).
    -   **Order**: `id`, `userId`, `totalAmount`, `status` (Pending, Paid, Shipped, Delivered, Cancelled), `createdAt`.
    -   **OrderItem**: `id`, `orderId`, `productId`, `quantity`, `price`.
    -   **Cart**: `id`, `userId`, `items` (JSON or relation).
    -   **Review**: `id`, `userId`, `productId`, `rating`, `comment`.
    -   **Payment**: `id`, `orderId`, `amount`, `status`, `providerId`.

3.  **Migration & Client Generation:**
    -   Configure `DATABASE_URL` in `.env`.
    -   Run `npx prisma migrate dev --name init`.
    -   Run `npx prisma generate`.

4.  **Database Connection:**
    -   Create `src/config/db.js` (or similar) to export the Prisma client instance.
    -   Verify connection in `app.js` startup.

## 2.2 Seeding (Optional but Recommended)
-   Create `prisma/seed.js` to populate:
    -   Default Users: Admin (`admin@example.com`), Vendor (`vendor@example.com`), User (`user@example.com`).
    -   Sample Categories and Products.
-   Add `prisma/seed.js` to `package.json` scripts.
