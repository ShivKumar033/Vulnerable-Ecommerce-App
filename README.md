# 🛒 Vulnerable E-Commerce Platform

> ⚠️ **WARNING:** This application is **INTENTIONALLY INSECURE**. It is designed for authorized security testing, penetration testing practice, and security training **ONLY**. Do **NOT** deploy this in production.

## Overview

A fully functional, industry-level e-commerce platform built with intentional security vulnerabilities for:

- 🎯 Penetration testing practice
- 🐛 Bug bounty simulation
- 🔐 Security training labs
- 🔧 DevSecOps validation
- 💼 Technical interview preparation

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | Node.js + Express.js (Monolith)     |
| Database | PostgreSQL (Prisma ORM)             |
| Auth     | JWT (Access + Refresh) + Cookies    |
| Frontend | React (Vite) + Context API         |
| Cache    | Redis (optional)                    |

## Project Structure

```
├── backend/
│   └── src/
│       ├── config/         # Database and app configuration
│       ├── models/         # Prisma database models
│       ├── routes/         # API route definitions
│       ├── controllers/    # Request handlers
│       ├── services/       # Business logic
│       ├── middlewares/     # Auth, logging, error handling
│       ├── utils/          # Helper functions
│       ├── app.js          # Express app setup
│       └── server.js       # Server entry point
├── frontend/
│   └── src/
│       ├── api/            # Axios API client
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page-level components
│       ├── context/        # React Context providers
│       ├── routes/         # Route configuration
│       ├── App.jsx         # App root component
│       └── main.jsx        # Entry point
├── docs/
│   ├── MASTER_PROMPT.md    # Full project requirements
│   └── Vulnerability-list.md
└── phase/                  # Phased implementation plans
```

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL
- Redis (optional)

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

The server starts at `http://localhost:5000`.  
Health check: `GET http://localhost:5000/api/health`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`.

## Vulnerability Coverage

This platform targets **45–55 real-world vulnerabilities** covering:

- ✅ OWASP Web Top 10
- ✅ OWASP API Top 10
- ✅ PortSwigger Web Security Academy categories
- ✅ Business logic flaws
- ✅ Race conditions
- ✅ OAuth vulnerabilities

See [`docs/Vulnerability-list.md`](docs/Vulnerability-list.md) for the full catalog.

## License

For educational and authorized security testing purposes only.
# Vulnerable-Ecommerce-App
