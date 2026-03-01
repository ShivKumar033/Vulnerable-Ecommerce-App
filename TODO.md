# Fix Admin Dashboard TypeError Issues

## Task
Fix TypeError issues in admin/dashboard/ endpoints where `.filter()` and `.map()` are called on non-array values.

## Root Cause
Backend returns `{ status: 'success', data: { users/orders/coupons/etc: [...] } }` but frontend accesses `response.data` directly (expecting array).

## Files Fixed

- [x] AdminUsers.jsx - Fixed data path and user name display
- [x] AdminOrders.jsx - Fixed data path
- [x] AdminCoupons.jsx - Fixed data path
- [x] Vendors.jsx - Fixed data path
- [x] Inventory.jsx - Fixed data path
- [x] FeatureFlags.jsx - Fixed data path
- [x] Webhooks.jsx - Fixed data path (webhookConfigs)
- [x] Logs.jsx - Fixed data path (auditLogs), changed endpoint from /admin/logs to /admin/audit-logs, mapped field names
- [x] AdminDashboard.jsx - Fixed to use /admin/analytics endpoint, fixed recent orders display

## Additional Fixes
- [x] Backend: Added lastLoginIP to user list from audit logs
- [x] Backend: Fixed users returning last login IP address

## Build Status
✅ Build successful

