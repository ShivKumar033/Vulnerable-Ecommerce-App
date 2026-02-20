# Implementation Plan: Admin & Vendor Dashboard Missing Features

## Status: ✅ IMPLEMENTED

## Overview
This plan implements the missing features from the MASTER_PROMPT.md for:
- Admin Dashboard
- Vendor Dashboard  
- Support Dashboard

## Phase 1: Admin Dashboard - ✅ IMPLEMENTED

### 1.1 System Health Dashboard ✅
- **Endpoint**: `GET /api/v1/admin/system-health`
- **Features**:
  - Database connection status
  - Memory usage
  - CPU usage
  - Uptime
  - Error rate tracking
- **File**: `admin.controller.js` - `getSystemHealth()`

### 1.2 IP Blacklist Management ✅
- **Endpoints**:
  - `GET /api/v1/admin/ip-blacklist` - List blocked IPs
  - `POST /api/v1/admin/ip-blacklist` - Block an IP
  - `DELETE /api/v1/admin/ip-blacklist/:id` - Unblock an IP
  - `POST /api/v1/admin/users/:id/block` - Block user account
  - `POST /api/v1/admin/users/:id/unblock` - Unblock user account
- **Model**: `IpBlacklist` (added to schema.prisma)
- **File**: `admin.controller.js`

### 1.3 Vendor Approval & Onboarding ✅
- **Endpoints**:
  - `GET /api/v1/admin/vendors/pending` - List pending vendor approvals
  - `GET /api/v1/admin/vendors` - List all vendors
  - `PUT /api/v1/admin/vendors/:id/approve` - Approve vendor
  - `PUT /api/v1/admin/vendors/:id/reject` - Reject vendor
- **File**: `admin.controller.js`

### 1.4 Report Generation (OS Command Vulnerable) ✅
- **Endpoints**:
  - `GET /api/v1/admin/reports/sales` - Generate sales report
  - `GET /api/v1/admin/reports/users` - Generate user report
  - `GET /api/v1/admin/reports/orders` - Generate order report
- **Vulnerability**: OS Command Injection (intentional)
- **File**: `admin.controller.js`

### 1.5 Log File Download (OS Command Vulnerable) ✅
- **Endpoints**:
  - `GET /api/v1/admin/logs` - List available log files
  - `GET /api/v1/admin/logs/:filename/download` - Download log file
- **Vulnerability**: Path Traversal, OS Command Injection (intentional)
- **File**: `admin.controller.js`

### 1.6 Backup Download (OS Command Vulnerable) ✅
- **Endpoints**:
  - `POST /api/v1/admin/backup/create` - Create backup
  - `GET /api/v1/admin/backup/list` - List backups
  - `GET /api/v1/admin/backup/:filename/download` - Download backup
  - `DELETE /api/v1/admin/backup/:filename` - Delete backup
- **Vulnerability**: OS Command Injection, Path Traversal (intentional)
- **File**: `admin.controller.js`

## Phase 2: Vendor Dashboard - ✅ IMPLEMENTED

### 2.1 Vendor Discount Creation ✅
- **Endpoints**:
  - `POST /api/v1/vendor/discounts` - Create discount
  - `GET /api/v1/vendor/discounts` - List discounts
  - `PUT /api/v1/vendor/discounts/:id` - Update discount
  - `DELETE /api/v1/vendor/discounts/:id` - Delete discount
- **Model**: `VendorDiscount` (added to schema.prisma)
- **File**: `vendor.controller.js`

### 2.2 Vendor Profile Page (SSTI Vulnerable) ✅
- **Endpoints**:
  - `GET /api/v1/vendor/profile` - Get vendor profile
  - `PUT /api/v1/vendor/profile` - Update profile with bio
  - `GET /api/v1/vendor/profile/render` - Render profile (SSTI vulnerable)
- **Vulnerability**: Server-Side Template Injection (intentional)
- **File**: `vendor.controller.js`

### 2.3 Return Request Handling (Vendor-specific) ✅
- **Endpoints**:
  - `GET /api/v1/vendor/returns` - List returns for vendor's products
  - `PUT /api/v1/vendor/returns/:id/approve` - Approve return
  - `PUT /api/v1/vendor/returns/:id/reject` - Reject return
- **File**: `vendor.controller.js`

### 2.4 Vendor Dashboard ✅
- **Endpoint**: `GET /api/v1/vendor/dashboard`
- **File**: `vendor.controller.js` - `getDashboard()`

## Phase 3: Support Dashboard - ✅ IMPLEMENTED

### 3.1 View Loyalty Points & Store Credit ✅
- **Endpoints**:
  - `GET /api/v1/support/users/:id/loyalty` - View user loyalty points
  - `GET /api/v1/support/users/:id/wallet` - View user wallet/store credit

### 3.2 View Coupon Usage History ✅
- **Endpoint**: `GET /api/v1/support/coupons/:id/usage`

### 3.3 View Audit Logs ✅
- **Endpoint**: `GET /api/v1/support/audit-logs`

### 3.4 Order Internal Notes ✅
- **Endpoints**:
  - `POST /api/v1/support/orders/:id/notes` - Add internal note
  - `GET /api/v1/support/orders/:id/notes` - Get internal notes

### 3.5 Escalate Orders ✅
- **Endpoint**: `POST /api/v1/support/orders/:id/escalate`

### 3.6 View IP Blacklist (Read-only) ✅
- **Endpoint**: `GET /api/v1/support/ip-blacklist`

### 3.7 Search Users & Orders ✅
- **Endpoints**:
  - `GET /api/v1/support/search/users`
  - `GET /api/v1/support/search/orders`

## Files Modified/Created

### Created:
- `backend/src/controllers/vendor.controller.js` (NEW)
- `backend/src/routes/vendor.routes.js` (NEW)

### Modified:
- `backend/src/controllers/admin.controller.js` - Added new admin features
- `backend/src/controllers/support.controller.js` - Added support features
- `backend/src/routes/admin.routes.js` - Added new admin routes
- `backend/src/routes/support.routes.js` - Added new support routes
- `backend/src/routes/vendor.routes.js` - Added vendor routes
- `backend/src/app.js` - Registered vendor routes
- `backend/prisma/schema.prisma` - Added IpBlacklist, VendorDiscount, OrderNote models

## New Prisma Models

```prisma
model IpBlacklist {
  id          String   @id @default(uuid())
  ipAddress   String   @unique
  reason      String?  @db.Text
  blockedById String?
  createdAt   DateTime @default(now())
}

model VendorDiscount {
  id              String   @id @default(uuid())
  vendorId        String
  name            String
  description     String?
  discountType    String   @default("percentage")
  discountValue   Decimal  @db.Decimal(10, 2)
  minOrderAmount Decimal? @db.Decimal(10, 2)
  maxUses        Int?
  currentUses     Int      @default(0)
  isActive        Boolean  @default(true)
  startsAt        DateTime?
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model OrderNote {
  id          String   @id @default(uuid())
  orderId     String
  userId      String
  content     String   @db.Text
  isInternal  Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

## To Apply Database Changes

Run the following command:
```bash
cd backend && npx prisma migrate dev --name add_ip_blacklist_vendor_discounts_order_notes
```

