# 🔐 Security Audit — נקי בשנייה (naki-beshniya)

**Date:** 2026-06-10
**Scope:** Entire project — every file, API integration, env var, and the full checkout/payment flow.
**Method:** Manual code review + attacker-style testing (price tampering, CSRF, injection, info disclosure, dependency scan), against both local and the live Vercel deployment.

---

## Summary

| # | Vulnerability | Severity | Status |
|---|---------------|----------|--------|
| 1 | Price/amount tampering (client-controlled charge amount) | 🔴 **Critical** | ✅ Fixed |
| 2 | No input validation on amount/qty/customer | 🟠 High | ✅ Fixed |
| 3 | No rate limiting on charge endpoint (card-testing/abuse) | 🟠 High | ✅ Mitigated |
| 4 | No anti-CSRF / origin check on charge endpoint | 🟡 Medium | ✅ Fixed |
| 5 | Technical error details leaked to client | 🟡 Medium | ✅ Fixed |
| 6 | Vulnerable dependencies (Next.js DoS + rewrite smuggling) | 🟠 High | ✅ Fixed |
| 7 | Missing security headers (clickjacking, MIME, HSTS, CSP) | 🟡 Medium | ✅ Fixed |
| 8 | Old backup HTML files committed to repo | 🟢 Low | ✅ Removed |
| 9 | `X-Powered-By` framework disclosure | 🟢 Low | ✅ Fixed |
| 10 | Reflected `desc`/`tx` in URL (cosmetic only) | 🟢 Info | Accepted (React-escaped) |

**No admin panel, no database, no auth surface** — minimal attack surface. Customer PII is never stored or logged by the app; it transits HTTPS straight to SUMIT.

---

## Findings & Fixes

### 1. 🔴 CRITICAL — Price tampering
**Was:** The checkout sent the price from the URL (`?price=…`) to the server, which charged that exact amount. An attacker could POST `{amount: 1}` (or edit the URL) and **buy any product for ₪1**.
**Impact:** Direct financial loss — unlimited discount on every order.
**Fix:** The server now ignores any client amount. It keeps a server-side `CATALOG` (qty → price) and derives the price itself. The client sends only `qty`; an invalid/unknown qty is rejected (HTTP 400).
**Verified:** `POST {qty:1, amount:1}` → server charges the catalog ₪99, not ₪1. `qty:99` → `400 בחירת מוצר לא תקינה`.

### 2. 🟠 HIGH — Input validation
**Fix:** Token type/length checked; qty restricted to the catalog; all customer fields trimmed, length-capped, and stripped of control characters (CRLF-injection defense); email format validated server-side.

### 3. 🟠 HIGH — Rate limiting
**Fix:** Per-IP limiter (8 charge attempts/min) added as defense-in-depth against card-testing.
**Note:** Serverless memory is per-instance; for production-grade protection add **Upstash Redis** or **Vercel WAF / Attack Challenge Mode**.

### 4. 🟡 MEDIUM — Anti-CSRF
**Fix:** The charge endpoint rejects cross-site requests by validating the `Origin` header against the site host (plus optional `ALLOWED_ORIGINS`). Cross-origin → `403`.

### 5. 🟡 MEDIUM — Error info disclosure
**Fix:** `TechnicalErrorDetails` from SUMIT is now logged server-side only; the client receives a friendly message.

### 6. 🟠 HIGH — Dependencies
**Was:** Next.js 14.2.35 — HIGH advisories incl. **HTTP request smuggling in rewrites** (we use a rewrite) + several DoS issues.
**Fix:** Upgraded to **Next.js 15.5.19** + `postcss` override. `npm audit` → **0 vulnerabilities**.

### 7. 🟡 MEDIUM — Security headers
**Fix:** Added in `next.config.mjs` for all routes:
`Content-Security-Policy` (scoped to jQuery + SUMIT + Google Fonts), `X-Frame-Options: DENY` (anti-clickjacking on the payment page), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (HSTS preload).

### 8/9. 🟢 LOW — Hygiene
Removed `index-v1-backup.html` / `index-v2-backup.html` from the repo; disabled `X-Powered-By`.

---

## Secrets posture
- ✅ No hardcoded credentials anywhere — all via `process.env`.
- ✅ `SUMIT_API_KEY` (private) used **server-side only** (`route.js`), never sent to the browser.
- ✅ `.env.local` git-ignored and never present in git history; only the empty `.env.example` is tracked.
- ✅ Build artifacts (`.next/`, `public/`) git-ignored.

## Verification (live, on Vercel)
- Price tamper (`qty=99`) → `400` ✅
- Cross-origin CSRF → `403` ✅
- Valid `qty=1` + dummy token → SUMIT rejects token (`402`), proving the catalog-price path ✅
- All security headers present; `X-Powered-By` absent ✅
- Checkout renders and the SUMIT SDK loads under CSP — payment flow intact ✅
- `npm audit` → 0 vulnerabilities ✅
