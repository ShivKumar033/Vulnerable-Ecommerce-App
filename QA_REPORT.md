# QA Testing Report - Vulnerable E-Commerce Application

**Date:** 2026-02-28  
**Testers:** QA Engineer (Automated & Manual Testing)  
**Application:** Vulnerable E-Commerce Platform  
**Version:** 1.0.0  
**Environment:** Development (localhost)

---

## Executive Summary

This is an **intentionally vulnerable** e-commerce application designed for security testing and training purposes. The application contains numerous security vulnerabilities as documented in the project. This QA report documents both the working functionality and the security issues found during testing.

---

## Working Features

### Backend API
| Feature | Status | Notes |
|---------|--------|-------|
| Health Check Endpoint | ✅ Working | `GET /api/health` returns server status |
| User Registration | ✅ Working | `POST /api/v1/auth/register` creates new users |
| User Login | ✅ Working | `POST /api/v1/auth/login` authenticates users |
| JWT Token Generation | ✅ Working | Access and refresh tokens are issued |
| Cart API (Guest) | ✅ Working | `GET /api/v1/cart` works without authentication |
| Categories API | ✅ Working | Returns empty array (no seed data) |
| Products API | ✅ Working | Returns empty array (no seed data) |
| Admin Dashboard API | ✅ Working | Accessible with ADMIN role token |
| Legacy v2 API | ✅ Working | Unauthenticated access to sensitive endpoints |

### Frontend
| Feature | Status | Notes |
|---------|--------|-------|
| Development Server | ✅ Running | Vite server on port 5173 |
| Home Page | ✅ Accessible | Main landing page |
| Login Page | ✅ Accessible | User authentication |
| Register Page | ✅ Accessible | User registration |

---

## Failing Features / Security Vulnerabilities

### CRITICAL VULNERABILITIES

#### 1. Mass Assignment - Privilege Escalation
- **Severity:** CRITICAL
- **Endpoint:** `POST /api/v1/auth/register`
- **Description:** Client can set `role` parameter in registration to gain ADMIN privileges
- **Reproduction Steps:**
  ```bash
  curl -X POST http://localhost:5000/api/v1/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"hacker@example.com","password":"Test123!","role":"ADMIN"}'
  ```
- **Expected Result:** Role should be forced to USER
- **Actual Result:** User registered with ADMIN role, can access admin dashboard

#### 2. Information Disclosure - Legacy API v2
- **Severity:** CRITICAL
- **Endpoint:** `GET /api/v2/users`
- **Description:** Returns ALL users including PASSWORD HASHES without authentication
- **Reproduction Steps:**
  ```bash
  curl http://localhost:5000/api/v2/users
  ```
- **Expected Result:** 401 Unauthorized
- **Actual Result:** Returns all users with bcrypt password hashes exposed

#### 3. Information Disclosure - Config Endpoint
- **Severity:** CRITICAL
- **Endpoint:** `GET /api/v2/config`
- **Description:** Exposes database credentials, JWT secret, API keys
- **Reproduction Steps:**
  ```bash
  curl http://localhost:5000/api/v2/config
  ```
- **Expected Result:** 401 Unauthorized
- **Actual Result:** Returns sensitive environment variables including:
  - Database URL with credentials
  - JWT Secret: "secret123"
  - Google OAuth credentials

#### 4. Code Injection - Debug Eval Endpoint
- **Severity:** CRITICAL
- **Endpoint:** `POST /api/v2/debug/eval`
- **Description:** Arbitrary code execution via eval()
- **Reproduction Steps:**
  ```bash
  curl -X POST http://localhost:5000/api/v2/debug/eval \
    -H "Content-Type: application/json" \
    -d '{"code":"process.exit(0)"}'
  ```
- **Expected Result:** 404 or 401
- **Actual Result:** Executes arbitrary JavaScript code on server

---

### HIGH VULNERABILITIES

#### 5. Account Enumeration
- **Severity:** HIGH
- **Endpoints:** `POST /api/v1/auth/login`, `POST /api/v1/auth/register`
- **Description:** Different error messages reveal if email exists
- **Reproduction Steps:**
  - Non-existent email: `"No account found with this email."`
  - Wrong password: `"Incorrect password."`
- **Expected Result:** Generic error message for all auth failures
- **Actual Result:** Specific messages allow user enumeration

#### 6. Password Reset Token in Response
- **Severity:** HIGH
- **Endpoint:** `POST /api/v1/auth/forgot-password`
- **Description:** Reset token returned in API response instead of email
- **Reproduction Steps:**
  ```bash
  curl -X POST http://localhost:5000/api/v1/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"testuser@example.com"}'
  ```
- **Expected Result:** Token sent via email only
- **Actual Result:** Token and reset URL returned in JSON response

#### 7. Token Not Invalidated on Logout
- **Severity:** HIGH
- **Endpoint:** `POST /api/v1/auth/logout`
- **Description:** Refresh tokens remain valid after logout
- **Expected Result:** Tokens should be invalidated
- **Actual Result:** Only cookies cleared, refresh tokens still valid in DB

#### 8. Token Reuse on Refresh
- **Severity:** HIGH
- **Endpoint:** `POST /api/v1/auth/refresh-token`
- **Description:** Old refresh token not invalidated after refresh
- **Expected Result:** Single-use tokens
- **Actual Result:** Multiple refresh tokens can be active simultaneously

#### 9. Cookie Security Flags Missing
- **Severity:** HIGH
- **Endpoint:** All auth endpoints
- **Description:** Cookies missing HttpOnly, Secure flags
- **Expected Result:** `HttpOnly: true, Secure: true, SameSite: strict`
- **Actual Result:** `httpOnly: false, secure: false, sameSite: 'none'`

#### 10. IDOR - User Profile Access
- **Severity:** HIGH
- **Endpoint:** `GET /api/v1/users/users/:id/profile`
- **Description:** Any authenticated user can access other users' profiles
- **Reproduction Steps:**
  ```bash
  curl http://localhost:5000/api/v1/users/users/98577fdd-8ae3-4457-8d82-cad0e9266dee/profile \
    -H "Authorization: Bearer <user_token>"
  ```
- **Expected Result:** 403 Forbidden or only own profile returned
- **Actual Result:** Returns profile of any user

---

### MEDIUM VULNERABILITIES

#### 11. Broken Access Control - IDOR Addresses
- **Severity:** MEDIUM
- **Endpoint:** `GET /api/v1/users/addresses/all`
- **Description:** Users can potentially access all addresses
- **Expected Result:** Only own addresses returned
- **Actual Result:** Endpoint exists for accessing all addresses

#### 12. Verbose Error Messages / Stack Traces
- **Severity:** MEDIUM
- **Endpoint:** Global Error Handler
- **Description:** Stack traces exposed in production-like errors
- **Expected Result:** Generic error messages
- **Actual Result:** Full stack traces in error responses

#### 13. Host Header Injection - Password Reset
- **Severity:** MEDIUM
- **Endpoint:** `POST /api/v1/auth/forgot-password`
- **Description:** Reset URL uses user-controlled Host header
- **Expected Result:** Server-controlled domain
- **Actual Result:** Domain can be poisoned via Host header

---

### LOW / INFORMATIONAL

#### 14. No Input Validation - SQL Injection
- **Severity:** LOW (Intended)
- **Note:** The debug SQL endpoint is intentionally vulnerable for testing

#### 15. No Products/Categories Data
- **Severity:** INFORMATIONAL
- **Description:** Database has no seeded products or categories
- **Expected Result:** Sample data available
- **Actual Result:** Empty arrays returned

---

## Test Summary

| Category | Tested | Passed | Failed |
|----------|--------|--------|--------|
| Authentication | 12 | 2 | 10 |
| Authorization | 8 | 1 | 7 |
| Data Exposure | 5 | 0 | 5 |
| Input Validation | 3 | 2 | 1 |
| Frontend | 3 | 2 | 1 |
| **TOTAL** | **31** | **7** | **24** |

---

## Recommendations

Since this is an **intentionally vulnerable application** for security training:

1. **DO NOT deploy to production** - This application contains deliberate security flaws
2. **Use for learning** - Excellent for penetration testing practice
3. **Fix before production** - If adapting for real use, address all HIGH and CRITICAL issues
4. **Database seeding** - Add seed data for products/categories to test full flows

---

## Testing Tools Used

- curl (API testing)
- Manual code review
- Browser (Frontend verification)
- Terminal (Server status)

---

**Report Generated:** 2026-02-28  
**Test Duration:** ~30 minutes  
**Application Status:** Functional but intentionally insecure

