# DIGICATLOG (digicatlog.com)

> **High-Performance Multi-Tenant QR Digital Menu SaaS Platform**  
> Modern, instantaneous digital menus replacing printed menu cards for restaurants, cafes, and bars.

---

## 📖 Overview

DIGICATLOG is a production-ready, full-stack multi-tenant SaaS application designed to empower restaurants and cafes with dynamic QR digital menus.

- **No Public Signup:** Shops are provisioned strictly by a Super Admin with temporary single-view credentials.
- **Enforced Security:** First-login password change, Argon2 hashing, JWT in `httpOnly` secure cookies, rate limiting, and 5-attempt account lockout.
- **Zero-Friction Customer Experience:** Customers scan the table QR code and instantly open `https://digicatlog.com/m/:shopSlug` without login or app installation.
- **Ultra-Fast Public Menu:** Mobile-first, code-split bundle (under **3.8 kB** gzipped), in-memory TTL caching with immediate invalidation upon shop edits, and sub-second load times over 4G.
- **Print-Ready QR Engine:** Direct on-the-fly generation of PNG, SVG, high-resolution printable table-tent (4x6"), and A4 poster PDFs with embedded shop branding.

---

## 🏗️ Architecture & Technology Stack

The project is structured as a TypeScript monorepo using npm workspaces:

```
├── apps/
│   ├── api/             # Node.js + Express Modular Monolith API
│   │   ├── prisma/      # Multi-tenant schema, migrations, seed script
│   │   └── src/         # Controllers, middlewares, services, storage drivers
│   └── web/             # React + Vite + Tailwind CSS + TanStack Query
│       └── src/         # Admin, Shop Dashboard, and Code-Split Public Menu
├── packages/
│   └── shared/          # Shared Zod schemas, types, DTOs, and constants
├── e2e/                 # Playwright end-to-end test suite and automated screenshots
├── render.yaml          # Render web service deployment manifest
└── vercel.json          # Vercel SPA deployment config with API reverse proxy
```

### Backend (`apps/api`)
- **Runtime:** Node.js, Express (TypeScript)
- **Database & ORM:** PostgreSQL, Prisma ORM with pooled + direct connection support
- **Authentication:** `argon2` password hashing, `jsonwebtoken`, `httpOnly`, `SameSite=Lax` cookies
- **Validation:** Zod schemas shared directly with the frontend
- **Image Pipeline:** Cloudinary SDK with automatic transforms (`f_auto,q_auto`, responsive widths) + automatic local storage fallback for offline/development environments
- **QR & PDF Engine:** `qrcode` (PNG/SVG) and `pdfkit` (table-tent & A4 printable posters)

### Frontend (`apps/web`)
- **Framework:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS with a warm cream/stone custom design system
- **State & Data Fetching:** TanStack Query (React Query) with optimistic UI updates and instant rollback
- **Routing:** React Router v6 with role-based route guards and dynamic lazy imports
- **Icons:** `lucide-react`

### Multi-Tenant Isolation
Every shop-scoped table (`Category`, `Item`, `QrScan`, `ShopSettings`) includes a `shopId` foreign key. The `requireTenantShop` middleware strictly sets `req.shopId = req.user.shopId` based on the cryptographically verified JWT session. The API never accepts or trusts `shopId` passed via request body, parameters, or query strings.

---

## 🚀 Quickstart: Local Development

### 1. Prerequisites
- **Node.js:** v18+ (tested on Node v20/v24)
- **Local PostgreSQL:** Running locally on port `5432` (Docker is NOT required).

### 2. Clone & Install
```bash
git clone https://github.com/your-username/digicatlog.git
cd digicatlog
npm install
```

### 3. Setup Databases
Ensure your local PostgreSQL instance is running. Create two databases:
```sql
CREATE DATABASE digicatlog;
CREATE DATABASE digicatlog_test;
```

### 4. Configure Environment Variables
Copy `.env.example` to `apps/api/.env`:
```bash
cp apps/api/.env.example apps/api/.env
```
Ensure `DATABASE_URL` matches your local PostgreSQL username and password:
```env
DATABASE_URL=postgresql://postgres:hello@localhost:5432/digicatlog
PORT=5055
CLIENT_ORIGIN=http://localhost:5185
```

### 5. Run Migrations & Seed
```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed script will initialize the Super Admin account and two rich demo restaurants:
- **Bella Italia Ristorante** (`/m/bella-italia`)
- **The Roasted Bean Cafe** (`/m/roasted-bean`)

Seed credentials will be output to your terminal:
- **Super Admin:** `superadmin` / `Admin@DigiCatlog2025!`
- **Demo Shop 1:** `bella_owner` / `Bella@2025!`
- **Demo Shop 2:** `bean_owner` / `Bean@2025!`

### 6. Start Development Servers
```bash
npm run dev
```
- **Web App:** [http://localhost:5185](http://localhost:5185)
- **API Server:** [http://localhost:5055/api](http://localhost:5055/api)
- **Health Check:** [http://localhost:5055/api/health](http://localhost:5055/api/health)

---

## 🧪 Testing Suite

DIGICATLOG includes comprehensive test coverage spanning unit, integration, tenant isolation, and browser E2E tests:

| Test Layer | Framework | Description |
|---|---|---|
| **API Integration** | Vitest + Supertest | Auth lockout, role guards, CRUD, QR generation, public caching (23 tests) |
| **Tenant Isolation** | Vitest + Supertest | Explicit cross-tenant IDOR attack prevention suite (8 tests) |
| **Web Components** | Vitest + RTL | Availability switch, item form validation, search & veg filters (8 tests) |
| **End-to-End** | Playwright | Full multi-role lifecycle journey + 390px mobile & tablet viewports (3 tests) |

### Run All Tests
```bash
npm run test:all
```

### Run Individual Test Suites
```bash
# Type checking
npm run typecheck

# API & Tenant Isolation tests
npm run test:api

# Frontend Component tests
npm run test:web

# Playwright Browser E2E tests
npm run test:e2e
```

### Generated E2E Screenshots
Screenshots captured automatically during E2E verification are saved in `e2e/screenshots/`:
- `01-dashboard-desktop.png`: Shop dashboard items view
- `02-public-menu-desktop.png`: Customer public menu
- `03-public-menu-soldout.png`: Instant "Sold out" badge reflection
- `04-menu-suspended.png`: Friendly suspended/inactive notice
- `05-mobile-public-menu.png`: 390px mobile menu with sticky category bar
- `06-mobile-dashboard.png`: 390px mobile dashboard
- `07-tablet-public-menu.png`: 768px tablet layout

---

## 🎨 Menu Templates

Shops can toggle between 4 distinct visual templates in real-time, coupled with a custom brand color accent:

1. **Classic Cream (`classic-cream`):** Elegant serif typography, warm parchment tones, ideal for traditional bistros, fine dining, and trattorias.
2. **Modern Dark (`modern-dark`):** Deep charcoal slate, neon/gold high-contrast accents, optimized for cocktail lounges and upscale nightlife.
3. **Minimal White (`minimal-white`):** High-whitespace, ultra-clean Scandinavian aesthetic for bakeries, juice bars, and contemporary eateries.
4. **Vibrant Cafe (`vibrant-cafe`):** Warm terracotta and amber accents, friendly rounded geometry, tailor-made for casual brunch spots and specialty cafes.

---

## 🌐 Production Deployment Guide

### 1. Database: Neon PostgreSQL
1. Create a project at [Neon.tech](https://neon.tech).
2. Copy the **Pooled connection string** (for standard queries) and the **Direct connection string** (for migrations):
   - Set `DATABASE_URL` to the pooled string (e.g. `postgresql://user:pass@ep-pooler.neon.tech/neondb?sslmode=require&pgbouncer=true`).
   - Set `DIRECT_URL` to the direct string (e.g. `postgresql://user:pass@ep.neon.tech/neondb?sslmode=require`).

### 2. Backend: Render
1. Connect your repository to [Render](https://render.com).
2. Use the provided blueprint [`render.yaml`](./render.yaml) or create a **Web Service**:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run prisma:generate && npm run build --workspace=packages/shared && npm run build --workspace=apps/api`
   - **Start Command:** `npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && npm run start --workspace=apps/api`
   - **Health Check Path:** `/api/health`
3. Configure the environment variables in the Render Dashboard:
   - `DATABASE_URL` & `DIRECT_URL`: Your Neon connection strings
   - `JWT_SECRET`: Random 32+ character string
   - `CLIENT_ORIGIN`: `https://digicatlog.com`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: From Cloudinary Console
   - `SUPER_ADMIN_LOGIN` & `SUPER_ADMIN_PASSWORD`: Production master credentials
4. *Note on Free Tier:* Render free instances spin down after 15 minutes of inactivity. Startup time is optimized to less than 1.5 seconds.

### 3. Frontend: Vercel
1. Import your repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/web` (or deploy from repository root using root `vercel.json`).
3. Set the Environment Variable:
   - `VITE_API_URL`: `/api`
4. The included `vercel.json` automatically handles:
   - Client-side SPA routing fallback to `/index.html`.
   - Reverse proxy rewrites of `/api/*` directly to `https://digicatlog-api.onrender.com/api/*`. This ensures the client and API share the same first-party domain context, allowing `httpOnly` session cookies to work seamlessly without third-party cookie restrictions.

### 4. Custom Domain (`digicatlog.com`)
1. In Vercel, navigate to **Settings > Domains** and add `digicatlog.com` and `www.digicatlog.com`.
2. Add the required DNS records (A record pointing to `76.76.21.21` and CNAME pointing to `cname.vercel-dns.com`).
3. Once the domain is verified, update `CLIENT_ORIGIN` in Render environment variables to `https://digicatlog.com`.

---

## 🔒 Security Summary

- **Session Security:** Cryptographically signed JWT tokens stored strictly in `httpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies.
- **Argon2 Password Hashing:** Resistant to GPU/ASIC cracking.
- **Brute-Force Protection:** Rate limiting (5 attempts/15 min) and account lockout after 5 consecutive failures.
- **Tenant Isolation:** Rigorously enforced at the database layer via session-derived `shopId`.
- **Upload Hardening:** Uploads restricted to JPEG, PNG, WebP, and AVIF under 3MB with magic-byte/mimetype validation.
- **Input Sanitization:** Strict Zod schema validation on every inbound payload and query parameter.
- **Zero Information Leakage:** Generic authentication error messages; stack traces suppressed in production.

---

## 📄 License
MIT License. Built autonomously with Antigravity.
