# Architectural & Technical Decisions: DIGICATLOG

This document records architectural, design, and implementation decisions made during the autonomous development of DIGICATLOG, including rationale and trade-offs.

---

## 1. Local Database vs. Neon Production Database

- **Decision:** Local development and testing use local PostgreSQL databases (`digicatlog` and `digicatlog_test` running at `localhost:5432`) without requiring Docker. Production connects to Neon with SSL (`sslmode=require`), leveraging pooled connection for application queries (`DATABASE_URL`) and direct connection for migrations (`DIRECT_URL`).
- **Rationale:** Meets the strict requirement to work with locally installed PostgreSQL without Docker overhead while maintaining 100% compatibility with Neon's serverless connection pooler in production.

---

## 2. Multi-Tenant Isolation Architecture

- **Decision:** All tenant-scoped tables (`Category`, `Item`, `QrScan`, `ShopSettings`) contain a foreign key `shopId`. Every shop-scoped endpoint passes through `requireTenantShop` middleware which binds `req.shopId = req.user.shopId`. Route handlers never inspect or trust `shopId` from query strings, route parameters, or JSON payloads.
- **Rationale:** Strict prevention of IDOR (Insecure Direct Object Reference) and accidental cross-tenant data leaks. An explicit test suite verifies tenant isolation across all CRUD and reordering operations.

---

## 3. Image Storage Strategy & Resilient Local Fallback

- **Decision:** Cloudinary SDK is integrated for image uploads, transforms (`f_auto,q_auto`, responsive widths), and automatic deletion of old assets when replaced. In environments where Cloudinary credentials are missing or unconfigured (such as fresh local checkouts or CI runners), the API automatically falls back to an internal local storage driver that stores files in `uploads/` and serves them statically.
- **Rationale:** Guarantees zero failures during local onboarding, automated testing, and development, while seamlessly utilizing Cloudinary CDN transforms in staging/production when API keys are supplied.

---

## 4. Authentication, Session Security & Lockout

- **Decision:**
  - Password hashing via `argon2` with memory and time cost tuned for production security.
  - Authentication tokens are issued as JSON Web Tokens stored exclusively in `httpOnly`, `SameSite=Lax` cookies (with `Secure` enabled in production).
  - Rate limiting on `/api/auth/login` (5 attempts per 15 minutes window).
  - Account lockout after 5 consecutive failed login attempts, requiring 15 minutes cooldown or Super Admin password reset.
  - First-login forced password change enforced via `mustChangePassword` flag. All dashboard routes block access until the temporary password is changed.
- **Rationale:** Complies with OWASP session management guidelines, prevents XSS-based token theft, mitigates brute-force attacks, and ensures newly created shop credentials are secure.

---

## 5. QR Code Generation & PDF Engine

- **Decision:**
  - QR codes are generated on-the-fly via the `qrcode` library supporting PNG and SVG formats.
  - Printable table-tent and A4 poster PDFs are generated server-side using `pdfkit`, embedding the shop's name, logo, custom instructions, and high-resolution vector/bitmap QR code.
- **Rationale:** Server-side PDF generation guarantees uniform print layout across all devices, printers, and screen sizes without browser print CSS quirks.

---

## 6. Public Menu Performance & In-Memory TTL Caching

- **Decision:**
  - Public menu route `/m/:slug` is code-split from the admin and shop dashboard bundles using React lazy loading and dynamic imports.
  - Backend caches `/api/public/menu/:slug` responses in an in-memory TTL cache (e.g. 10 minutes) invalidated immediately whenever the shop updates categories, items, or settings.
  - API returns appropriate `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` headers and ETag support.
- **Rationale:** Ensures sub-second load times on mobile 4G devices and prevents database bottlenecks during peak restaurant scanning hours.

---

## 7. Menu Templates Architecture

- **Decision:** 4 distinct template designs are supported:
  1. `classic-cream`: Warm paper tones, serif headings, elegant traditional bistros.
  2. `modern-dark`: Sleek dark slate, crisp high-contrast accents, upscale nightlife & lounges.
  3. `minimal-white`: Clean, airy, ultra-fast typography-driven Scandinavian aesthetic.
  4. `vibrant-cafe`: Energetic warm amber/terracotta palette, rounded cards, casual dining & cafes.
- **Rationale:** Provides immediate visual differentiation suited to diverse restaurant aesthetics, with customizable brand accents.
