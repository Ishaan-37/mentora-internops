# InternOps — Phase 1 Setup Guide

## What's in Phase 1

| File | Purpose |
|---|---|
| `schema.sql` | PostgreSQL schema — all 10 tables, enums, indexes, triggers, seed data |
| `backend/server.js` | Express app with middleware, rate limiting, error handling |
| `backend/config/db.js` | PostgreSQL connection pool + query helper |
| `backend/config/logger.js` | Winston structured logger |
| `backend/middleware/auth.js` | JWT authentication middleware |
| `backend/middleware/rbac.js` | Role-based access control (admin/mentor/intern) |
| `backend/middleware/validate.js` | Input validation + XSS sanitization |
| `backend/controllers/authController.js` | Login, logout, refresh, me, change password |
| `backend/controllers/adminController.js` | Add users, batches, assign mentor, dashboard |
| `backend/routes/auth.js` | Auth route definitions with validation chains |
| `backend/routes/admin.js` | Admin route definitions with RBAC |
| `backend/__tests__/auth.test.js` | Jest tests for auth + RBAC |
| `docker-compose.yml` | Local dev: PostgreSQL + API in Docker |
| `backend/Dockerfile.dev` | Dev image with nodemon hot-reload |

---

## Prerequisites

- Node.js 18+ (`node --version`)
- PostgreSQL 14+ OR Docker Desktop
- Git

---

## Option A: Run with Docker (Recommended)

```bash
# 1. Clone and enter the project
git clone <your-repo-url>
cd internops

# 2. Start PostgreSQL + API (schema auto-applied on first run)
docker compose up -d

# 3. Verify it's running
curl http://localhost:5000/api/health
# Expected: {"success":true,"status":"healthy",...}

# 4. Watch logs
docker compose logs -f api
```

---

## Option B: Run locally (no Docker)

### 1. Create the database

```bash
psql -U postgres
```
```sql
CREATE DATABASE internops;
\q
```
```bash
psql -U postgres -d internops -f schema.sql
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
nano .env

npm install
npm run dev
```

### 3. Verify

```bash
curl http://localhost:5000/api/health
```

---

## Test the API

### Login as default admin

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iitjammu.ac.in","password":"Admin@1234"}' \
  -c cookies.txt
```

**Change this password immediately after first login!**

### Get current user (uses cookie)

```bash
curl http://localhost:5000/api/auth/me \
  -b cookies.txt
```

### Create a mentor (as admin)

```bash
curl -X POST http://localhost:5000/api/admin/add-mentor \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Sankar Behera",
    "email": "sankar@iitjammu.ac.in",
    "password": "Mentor@1234",
    "mentorRole": "research_scholar"
  }'
```

### Create an intern (as admin)

```bash
# First get the batch ID from:
curl http://localhost:5000/api/admin/all-batches -b cookies.txt

# Then create intern:
curl -X POST http://localhost:5000/api/admin/add-intern \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "Kakashi Dev",
    "email": "kakashi@intern.iitjammu.ac.in",
    "password": "Intern@1234",
    "batchId": "<batch-uuid-from-above>",
    "mentorId": "<mentor-uuid-from-add-mentor>"
  }'
```

### Admin dashboard

```bash
curl http://localhost:5000/api/admin/dashboard -b cookies.txt
```

---

## Run tests

```bash
cd backend
npm test
```

Expected output:
```
PASS __tests__/auth.test.js
  POST /api/auth/login
    ✓ returns 400 for invalid email format
    ✓ returns 401 for non-existent user
    ✓ returns 200 with access token on successful login
  RBAC — Admin-only routes
    ✓ returns 403 when intern tries to access admin route
    ✓ allows admin to access admin-only route
```

---

## Security notes

- Passwords are bcrypt-hashed with cost factor 10 (configurable via `BCRYPT_ROUNDS`)
- JWTs stored in `httpOnly` cookies — inaccessible to JavaScript (XSS-safe)
- Refresh tokens have a separate 7-day lifetime; access tokens expire in 1 hour
- All inputs pass through XSS sanitization before hitting controllers
- Parameterized queries throughout — no raw SQL interpolation
- Rate limiting: 100 req/min globally, 10 login attempts / 15 min
- Helmet sets 11 security headers including CSP, HSTS, X-Frame-Options

---

## What comes next (Phase 2)

- Mentor controller + routes (interns list, create work items, review submissions)
- Intern controller + routes (dashboard, work items, submit work)
- Multer file upload middleware (PDF + code files)
- Full React frontend with sidebar, 3 dashboards, and all forms
