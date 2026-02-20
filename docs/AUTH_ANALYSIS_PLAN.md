# Authentication & Authorization Gap Analysis & Implementation Plan

## Section 1: AUTHENTICATION & AUTHORIZATION - MASTER_PROMPT.md Requirements

### Feature Requirements from MASTER_PROMPT.md:

| Feature | Status | Notes |
|---------|--------|-------|
| User registration and login | ✅ IMPLEMENTED | `auth.controller.js` |
| Password hashing (bcrypt) | ✅ IMPLEMENTED | `utils/password.js` |
| JWT access + refresh tokens | ✅ IMPLEMENTED | `utils/jwt.js` |
| Role-based access control (USER, ADMIN, VENDOR, SUPPORT) | ✅ IMPLEMENTED | `authorize.js` |
| Email verification (mock) | ✅ IMPLEMENTED | `user.controller.js` |
| Password reset flow (mock) | ✅ IMPLEMENTED | `auth.controller.js` |

---

## Section 2: USER ACCOUNT MANAGEMENT - MASTER_PROMPT.md Requirements

### Feature Requirements from MASTER_PROMPT.md:

| Feature | Status | Notes |
|---------|--------|-------|
| Loyalty points balance & history | ✅ IMPLEMENTED | `loyalty.controller.js`, `loyalty.routes.js` |
| Store credit wallet | ✅ IMPLEMENTED | `wallet.controller.js` (existing) |
| Gift card purchase & redemption | ✅ IMPLEMENTED | `giftcard.controller.js`, `giftcard.routes.js` |
| Return/refund request flow | ✅ IMPLEMENTED | `return.controller.js`, `return.routes.js` |
| Order tracking timeline page | ✅ IMPLEMENTED | Order status in order response |
| Saved payment methods | ✅ IMPLEMENTED | `user.controller.js` |
| OAuth account linking | ✅ IMPLEMENTED | `oauth.controller.js` |
| Profile with bio/display name | ✅ IMPLEMENTED | Schema + `user.controller.js` |
| Each Roles have own dashboard | ✅ IMPLEMENTED | `user.controller.js` getDashboard |
| Account deletion request | ✅ IMPLEMENTED | `accountDeletion.controller.js`, `accountDeletion.routes.js` |
| Profile update | ✅ IMPLEMENTED | `user.controller.js` |
| Multiple saved addresses | ✅ IMPLEMENTED | `user.controller.js` |
| Order history | ✅ IMPLEMENTED | `order.controller.js` |
| Wishlist | ✅ IMPLEMENTED | `user.controller.js` |

---

## Section 1 & 2 - Missing Features Found & Implemented:

### ✅ ADDED: New Controllers Created:

1. **`backend/src/controllers/loyalty.controller.js`**
   - `getBalance()` - Get user's loyalty points balance
   - `getHistory()` - Get loyalty points transaction history
   - `earnPoints()` - Add loyalty points (for purchases)
   - `redeemPoints()` - Redeem loyalty points

2. **`backend/src/controllers/giftcard.controller.js`**
   - `checkBalance()` - Check gift card balance (public)
   - `listGiftCards()` - List user's gift cards
   - `purchaseGiftCard()` - Purchase a new gift card
   - `redeemGiftCard()` - Redeem a gift card

3. **`backend/src/controllers/return.controller.js`**
   - `listReturnRequests()` - List user's return requests
   - `createReturnRequest()` - Create a new return request
   - `getReturnRequest()` - Get return request details
   - `approveReturnRequest()` - Approve return (Admin/Vendor)
   - `rejectReturnRequest()` - Reject return (Admin/Vendor)
   - `completeReturnRequest()` - Complete return and refund

4. **`backend/src/controllers/accountDeletion.controller.js`**
   - `requestAccountDeletion()` - Submit account deletion request
   - `getDeletionStatus()` - Check status of own request
   - `listDeletionRequests()` - List all requests (Admin)
   - `approveDeletionRequest()` - Approve deletion (Admin)
   - `rejectDeletionRequest()` - Reject deletion (Admin)

### ✅ ADDED: New Routes Created:

1. **`backend/src/routes/loyalty.routes.js`**
   - GET `/api/v1/loyalty/balance`
   - GET `/api/v1/loyalty/history`
   - POST `/api/v1/loyalty/earn`
   - POST `/api/v1/loyalty/redeem`

2. **`backend/src/routes/giftcard.routes.js`**
   - GET `/api/v1/giftcards/check` (public)
   - GET `/api/v1/giftcards/`
   - POST `/api/v1/giftcards/purchase`
   - POST `/api/v1/giftcards/redeem`

3. **`backend/src/routes/return.routes.js`**
   - GET `/api/v1/returns/`
   - POST `/api/v1/returns/`
   - GET `/api/v1/returns/:id`
   - PUT `/api/v1/returns/:id/approve`
   - PUT `/api/v1/returns/:id/reject`
   - PUT `/api/v1/returns/:id/complete`

4. **`backend/src/routes/accountDeletion.routes.js`**
   - POST `/api/v1/users/delete-account`
   - GET `/api/v1/users/deletion-status`
   - GET `/api/v1/admin/deletion-requests`
   - PUT `/api/v1/admin/deletion-requests/:id/approve`
   - PUT `/api/v1/admin/deletion-requests/:id/reject`

### ✅ ADDED: Updated Files:

1. **`backend/src/app.js`**
   - Registered new routes: `/api/v1/loyalty`, `/api/v1/giftcards`, `/api/v1/returns`
   - Account deletion routes registered under `/api/v1`

2. **`backend/src/controllers/user.controller.js`**
   - Added `bio` and `displayName` fields to profile update
   - Added bio and displayName to getProfile response

3. **`backend/prisma/schema.prisma`**
   - Added relation names for GiftCard (PurchasedBy, RedeemedBy)
   - Database migrated with new models

### ✅ VERIFIED: Host Header Injection Vulnerability:

The password reset flow already includes Host Header Injection vulnerability as required:
- Location: `auth.controller.js` - `forgotPassword()` function
- Uses `req.headers.host` to construct the reset URL
- This is intentional for security testing

---

## VULNERABILITIES VERIFIED FOR SECTION 1 & 2:

| Vulnerability | Location | Status |
|--------------|----------|--------|
| Mass assignment (role) | auth.controller.js, user.controller.js | ✅ Present |
| JWT claim tampering | authenticate.js | ✅ Present |
| Password reset token reuse | auth.controller.js | ✅ Present |
| Host header injection | auth.controller.js (forgotPassword) | ✅ Present |
| IDOR in orders/addresses | user.controller.js | ✅ Present |
| Missing role checks | Various | ✅ Present |
| Session management flaws | auth.controller.js | ✅ Present |
| OAuth misconfiguration | oauth.controller.js | ✅ Present |
| Account linking without re-auth | oauth.controller.js | ✅ Present |

---

## Summary:

All required features from Section 1 (Authentication & Authorization) and Section 2 (User Account Management) have been analyzed and implemented where missing. The core functionality is complete with intentional vulnerabilities for security testing purposes.

