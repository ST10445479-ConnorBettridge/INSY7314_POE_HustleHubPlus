# HustleHub+

A secure full-stack freelance marketplace platform built with the **MERN** stack (MongoDB, Express, React, Node.js). Freelancers publish gigs, clients book and pay for them, and each side gets a dedicated dashboard.

## Submission Artefacts

- **Demonstration video**: <add link to your demo video here — still being made>
- **Postman collection**: [`HustleHub+ Postman Collection.json`](HustleHub%2B%20Postman%20Collection.json)
- **Architecture diagram**: [`architecture-diagram.svg`](architecture-diagram.svg)
- **Web & API response screenshots**: [`docs/screenshots/`](docs/screenshots/)
- **Test suites**: backend Jest (60 tests), frontend Vitest (19 tests), end-to-end smoke (26 assertions), Postman/Newman (110 assertions)

## Table of Contents

0. [Submission Artefacts](#submission-artefacts)
1. [System Overview](#system-overview)
2. [Intended Users](#intended-users)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [API Endpoints](#api-endpoints)
6. [Security Decisions](#security-decisions)
   - [Password Hashing](#password-hashing)
   - [Token-Based Authentication](#token-based-authentication)
   - [Input Validation](#input-validation)
   - [HTTPS Configuration](#https-configuration)
   - [Additional Security Measures](#additional-security-measures)
7. [Frontend (React)](#frontend-react)
8. [Android App](#android-app)
9. [Setup Instructions](#setup-instructions)
10. [Running the Tests](#running-the-tests)
11. [Screenshots](#screenshots)

---

## System Overview

HustleHub+ connects **freelancers** offering services with **clients** seeking to book them. The platform handles gig listings, bookings, payment transactions and income tracking with estimated tax calculations.

The system follows the **MERN architecture** and runs over HTTPS:

- **Backend**: Express + Node.js with a real MongoDB persistence layer (an embedded in-memory MongoDB server in development, or any `MONGODB_URI`)
- **Frontend**: React single-page application (Vite + React Router) consuming the same API
- **Mobile**: a native **Android app (Kotlin)** consuming the same API over TLS with certificate pinning
- **HTTPS everywhere**: the server enforces TLS; all three clients trust the same self-signed certificate

### Core Features

- Secure user registration and authentication (bcrypt + JWT)
- Role-based accounts with access control (Client, Freelancer; Admin cannot be self-assigned)
- Gig marketplace — browse, create, update, delete gig listings
- Booking workflow — clients book gigs, transactions are recorded automatically
- Income dashboard for freelancers — earnings + estimated tax (SECA-style 15.3%)
- Input validation, sanitisation and NoSQL-injection defence
- Hardened API (rate limiting, CSP headers, TLS 1.2+, controlled errors)

---

## Intended Users

| Role | Description |
|------|-------------|
| **Client** | Browses services and books gigs offered by freelancers |
| **Freelancer** | Creates and manages gig listings, earns income, views tax estimates |
| **Admin** | Reserved for platform management; cannot be self-assigned through the API |

---

## Architecture

![HustleHub+ Architecture Diagram](architecture-diagram.svg)

### Diagram Description

1. **Client Layer**: three clients share the same HTTPS boundary — the **React web app** (this phase), the **Android app** (Kotlin, Retrofit + OkHttp, pinned self-signed cert at `https://10.0.2.2:3443/`), and **Postman/Newman** for API testing.

2. **API Layer**: the Express server routes requests through middleware pipelines:
   - **Security**: Helmet (security headers), rate limiting, HTTPS enforcement, `express-mongo-sanitize`, XSS sanitisation
   - **Authentication**: JWT verification for protected routes
   - **Validation**: express-validator rules for every endpoint
   - **Error handling**: centralised handler that never leaks internals
   - **Logging**: Winston structured logs

3. **Data Layer**: MongoDB (Mongoose). In development the server boots a real embedded MongoDB instance automatically; provide `MONGODB_URI` to use an existing database.

### System Boundary

All external communication occurs over TLS through the HTTPS server — the single entry point. Middleware, controllers and models operate inside the server process.

### Security Boundaries

- **Network**: HTTPS/TLS protects data in transit
- **Authentication**: JWT gates access to protected resources
- **Validation**: every input is validated and sanitised before processing
- **Error**: controlled responses prevent information disclosure
- **Storage**: passwords are bcrypt-hashed, never stored in plain text

---

## Project Structure

```
├── HustleHub+ Postman Collection.json   # Importable Postman collection (generated)
├── scripts/
│   └── build-postman.js                 # Regenerates the Postman collection
├── backend/
│   ├── server.js                        # HTTPS server entry point
│   ├── package.json                     # scripts: start, dev, seed, e2e:smoke, test, test:newman
│   ├── .env.example                     # environment template (JWT_SECRET etc.)
│   ├── certs/                           # generated self-signed cert + key
│   ├── scripts/
│   │   ├── generate-cert.js             # cert generator (auto-syncs Android pin)
│   │   ├── extract-certs.js
│   │   ├── seed.js                      # demo data seeder
│   │   └── e2e-smoke.js                 # HTTPS end-to-end smoke suite
│   ├── src/
│   │   ├── app.js                       # Express app + security middleware + SPA serving
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT verify + role guard
│   │   │   ├── errorHandler.js          # centralised errors + AppError
│   │   │   ├── validate.js              # express-validator rules
│   │   │   └── sanitize.js              # XSS string stripping
│   │   ├── models/                      # Mongoose: User, Gig, Booking, Transaction
│   │   ├── routes/                      # auth, gigs, bookings, income
│   │   └── utils/logger.js
│   └── tests/                           # Jest unit/integration tests (60)
└── frontend/
    ├── package.json                     # scripts: dev, build, preview, test
    ├── index.html
    └── src/
        ├── main.jsx / App.jsx           # router + routes
        ├── index.css                    # design system
        ├── api/client.js                # fetch wrapper (JWT header, envelope unwrap)
        ├── context/AuthContext.jsx      # auth state + token persistence
        ├── components/                  # Layout, Navbar, ProtectedRoute, GigCard, Field, Alert, ...
        ├── pages/                       # Home, Login, Register, GigDetail, NotFound
        │   └── dashboard/               # DashboardLayout, FreelancerGigs, GigForm,
        │                                #   BookingsList, FreelancerIncome
        └── test/                        # Vitest + Testing Library suites (19)
```

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/health` | No | – | Health check (with security header report) |
| POST | `/api/auth/register` | No | – | Register client/freelancer |
| POST | `/api/auth/login` | No | – | Login, returns JWT |
| GET | `/api/auth/profile` | Yes | Any | Current user profile |
| GET | `/api/gigs` | No | – | List gigs (search by category/query) |
| GET | `/api/gigs/:id` | No | – | Gig detail |
| POST | `/api/gigs` | Yes | Freelancer | Create a gig |
| PUT | `/api/gigs/:id` | Yes | Owner | Update own gig |
| DELETE | `/api/gigs/:id` | Yes | Owner | Delete own gig (+ bookings/transactions) |
| POST | `/api/bookings` | Yes | Client | Book a gig (auto-creates transaction) |
| GET | `/api/bookings` | Yes | Client | My bookings |
| GET | `/api/bookings/by-gig/:gigId` | Yes | Freelancer | Bookings on my gig |
| GET | `/api/income` | Yes | Freelancer | Earnings + tax estimate |

### Response Envelope

Every response follows the same shape: `{ status: 'success' | 'error', message, data?, statusCode? }`. Errors carry a `statusCode` and a human-readable `message` (combined validation messages, never stack traces).

**POST /api/auth/login**
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user": { "id": "...", "name": "Zane Dev", "email": "zane@hustlehub.demo", "role": "freelancer" },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Validation error example (400)**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Title is required. Description is required"
}
```

---

## Security Decisions

### Password Hashing

**Algorithm**: bcrypt with 12 salt rounds.

- **Slow by design**: ~250ms per hash limits brute-force velocity.
- **Built-in salting**: unique salt per password; identical passwords hash differently.
- **Adaptive cost**: rounds can be raised as hardware improves.
- **Constant-time compare** prevents timing attacks during login.

```javascript
const hashedPassword = await bcrypt.hash(userData.password, 12);
const isMatch = await bcrypt.compare(password, user.password);
```

### Token-Based Authentication

**Algorithm**: JWT, HS256, pinned to `algorithms: ['HS256']` so `alg: none` / algorithm-confusion are rejected. Tokens are bound to issuer `hustlehub-plus` and audience `hustlehub-plus-api`, expire in 1 hour (`JWT_EXPIRES_IN`), and are signed with a 32+ character random secret (server refuses to start otherwise).

**Payload**: `{ id, email, role, name, iat, exp }` — stateless, self-validating.

**Validation flow**: `Authorization: Bearer <token>` → signature verified → expiry checked → payload attached to `req.user`; invalid/expired tokens return 401.

### Input Validation

Express-validator rules for every endpoint (registration, login, gig create/update, booking, `:id` params):

- **Register**: name ≤ 100 chars, valid email, strong password (≥ 8 chars, upper/lower/digit/special), role restricted to `client` / `freelancer`
- **Login**: valid email + non-empty password
- **Gig**: title 3–100, description 10–2000, price 1–1,000,000, delivery days 1–365
- **IDs**: all Mongo `:id` params validated as ObjectIds

All string fields are **trimmed** and **XSS-stripped** (`xss` + `sanitize.js`) before storage; `express-mongo-sanitize` neutralises `$`-prefixed operator injection (`$gt`, `$ne`, …).

### HTTPS Configuration

Node `https.createServer` with a locally generated self-signed certificate (node-forge). TLS 1.2+ enforced (`minVersion: 'TLSv1.2'`). In production a trusted CA (e.g. Let's Encrypt) would replace the self-signed cert.

Self-signed certificates trigger browser warnings — appropriate for development and testing only.

### Additional Security Measures

**Helmet** sets `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and more.

**Rate limiting** (`express-rate-limit`, per IP, in-memory):
- Global: 100 / 15 min
- Auth (login + register): 10 / 15 min
- Bookings: 20 / 15 min

**Request body limit**: `express.json({ limit: '10kb' })` (413 beyond) and malformed JSON returns a controlled 400.

**Controlled errors**: unexpected errors return generic `Internal server error`; full details go to server logs only (Winston).

**User enumeration defence**: login performs a dummy bcrypt comparison for unknown emails so account existence can't be detected via response timing.

### Hardening Against Common Attacks

- **NoSQL injection**: `express-mongo-sanitize` strips `$`/`.` operator keys; `:id` params are validated as ObjectIds. Verified by `{ "$gt": "" }` injection attempts being neutralised.
- **XSS / stored XSS**: `xss` strips script tags from all string input before storage; the React app additionally renders nothing as raw HTML. Verified by injecting `<script>` payloads and confirming stripped output.
- **Privilege escalation**: the `admin` role cannot be self-assigned; registration role is whitelist-validated. Verified by `role: "admin"` returning 400.
- **JWT attacks**: algorithm pinned to HS256; issuer/audience bound; 401 on invalid/expired.
- **Mass assignment**: only whitelisted fields are extracted from bodies.
- **Rate limiting**: brute-force throttled with 429 responses — proven by the Postman suite's 12-login flood test.

All of the above are covered by `backend/tests/security.test.js` and the Postman/Newman suite.

---

## Frontend (React)

A Vite + React single-page app served by the backend itself (built `dist` mounted at `/` with SPA fallback).

### Screens

| Route | Screen | Access |
|-------|--------|--------|
| `/` | Home — gig marketplace with search | Public |
| `/login`, `/register` | Auth pages | Public |
| `/gigs/:id` | Gig detail + book | Public (book = client) |
| `/dashboard` | Client dashboard — my bookings | Client |
| `/dashboard/freelancer` | Freelancer dashboard — my gigs | Freelancer |
| `/dashboard/gigs/new`, `/dashboard/gigs/:id/edit` | Gig form | Freelancer |
| `/dashboard/income` | Income + estimated tax | Freelancer |
| `*` | 404 Not Found | – |

### Key behaviours

- **JWT persistence**: token + user stored in `localStorage`; `AuthContext` restores the session on load.
- **Protected routes**: `<ProtectedRoute role="freelancer">` redirects to `/login` and blocks cross-role access.
- **API client** unwraps the envelope (`{ data: ... }`) and normalises errors.
- **Accessible styling**: `Field` components pair labels with hints; a CSS design system in `src/index.css` (dark theme, cards, badges, tables).
- All user-generated content is escaped on render (no `dangerouslySetInnerHTML`).

---

## Android App

A native Kotlin client in `android/` from Part 1 (Splash → Login → Register → Dashboard) using Retrofit + OkHttp with **certificate pinning** against the self-signed cert (`res/raw/server_cert.pem`) and AES-256-GCM token storage via `EncryptedSharedPreferences`. It shares the same backend and API envelope as the web app. See `android/` for the full structure. Rebuild after regenerating the backend certificate (the generator auto-syncs the pin).

---

## Setup Instructions

### Prerequisites

- Node.js v18+ and npm
- Android Studio Giraffe (2022.3.1)+ — only for the mobile app
- No MongoDB install needed — development uses an embedded in-memory server

### Backend

```bash
cd backend
npm install
Copy-Item .env.example .env               # then set a real JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node scripts/generate-cert.js             # creates certs/ + syncs Android pin
npm start                                 # HTTPS server on https://localhost:3443
```

The server refuses to start if `JWT_SECRET` is missing or under 32 characters.

> **In-memory database**: each start boots a fresh MongoDB instance (unless `MONGODB_URI` is set), so data resets on restart. After restarting, re-seed demo data:

```bash
npm run seed     # in backend/ — needs the server running, writes via the API
```

Demo accounts (all password `DemoPass1!`):

| Role | Email |
|------|-------|
| Freelancer | `zane@hustlehub.demo` |
| Freelancer | `mia@hustlehub.demo` |
| Client | `alex@hustlehub.demo` |

> **Rate limiters are in-memory per server instance.** After heavy automated testing (especially the Postman 429-flood test), restart the server to reset them.

### Frontend

```bash
cd frontend
npm install
npm run dev      # Vite dev server (proxy → https://localhost:3443)
```

For production-style serving, build and let the backend serve it:

```bash
npm run build    # outputs dist/, served by backend at /
```

(Node's HTTPS cert must be trusted, or the browser will warn — see below.)

### Trusting the self-signed certificate

Browsers and Postman show a warning for self-signed certs. Options:
- **Postman/Newman**: disable SSL verification, or pass `newman run … --insecure`
- **Browser**: accept the warning, or install `certs/cert.pem` into the OS trust store

---

## Running the Tests

> Several suites need the backend running. After restarting it, run `npm run seed` in `backend/` first (embedded DB is fresh).

### Backend unit/integration (Jest)

```bash
cd backend
npm test                     # 60 tests — auth, RBAC, gigs CRUD, bookings, income, security
```

### Frontend (Vitest + Testing Library)

```bash
cd frontend
npm test                     # 19 tests across 5 suites (Navbar, AuthPages, Home, GigDetail, GigForm)
```

### End-to-end smoke (HTTPS)

```bash
cd backend
npm run e2e:smoke            # 26 assertions against the running server
```

### Postman/Newman (API acceptance)

The collection at `HustleHub+ Postman Collection.json` walks the full product flow — register, login, gig CRUD, booking → transaction, income, plus the security suite (RBAC, XSS, NoSQL injection, admin escalation, 429 throttling):

```bash
cd backend
npm run test:newman          # 53 requests / 110 assertions against a running, seeded server
```

Regenerate the collection after changing requests:

```bash
node scripts/build-postman.js
```

---

## Screenshots

All web UI and API screenshots live in [`docs/screenshots/`](docs/screenshots/) — see [the index there](docs/screenshots/README.md) for the full frame-by-frame list.

### Current phase (web app)

| # | Screen | Filename |
|---|--------|----------|
| 1 | Home — gig marketplace | `web_01_home.png` |
| 2 | Login | `web_02_login.png` |
| 3 | Register | `web_03_register.png` |
| 4 | Gig detail (client view) | `web_04_gig_detail.png` |
| 5 | Client dashboard — bookings | `web_05_client_dashboard.png` |
| 6 | Freelancer dashboard — my gigs | `web_06_freelancer_dashboard.png` |
| 7 | Gig form (create/edit) | `web_07_gig_form.png` |
| 8 | Income + estimated tax | `web_08_income.png` |
| 9 | 404 Not Found | `web_09_404.png` |