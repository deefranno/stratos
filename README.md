# Stratos Trucking Profit Navigator

A subscription financial dashboard for trucking owner-operators.
**React + Vite + TypeScript + Tailwind CSS · Express + Prisma + Better Auth · PostgreSQL · Stripe.**

Product name (use everywhere): **Stratos Trucking Profit Navigator**
Brand: Stratos Financials — tokens extracted from stratosfinancials.com
(green `#13A581`, accent `#EC3013`, Archivo, warm neutrals). The official
`stratos-logo.webp` is used unchanged (220×139, aspect ratio preserved).

## Repository layout

```
packages/financial-engine/   Single source of truth for ALL financial formulas
apps/api/                    Express + Prisma + Better Auth + Stripe API
  prisma/schema.prisma       9 tables (see §13), Decimal money, no stored totals
  scripts/smoke.mjs          35-check integration test (run against a live server)
apps/web/                    React SPA (customer + Stratos administration)
```

## Financial contract

All math lives in `@stratos/financial-engine` and is used by the dashboard,
entry previews, profit analysis, fuel reporting, trend charts, reports, and
admin views — never re-implemented per surface:

```
Fixed Costs           = Truck Payment + Insurance + Permits + Other Fixed Costs
Variable Costs        = Maintenance + Tires + Tolls + Other Variable Costs
Total Operating Costs = Fuel Spend + Fixed Costs + Variable Costs   ← fuel exactly once
Profit                = Revenue − Total Operating Costs
Margin                = Profit / Revenue × 100 (0 if revenue is 0)
MPG                   = Miles / Gallons (0 if gallons are 0; never uses fuel spend)
Fuel Cost Per Mile    = Fuel Spend / Miles (0 if miles are 0)
Total Cost Per Mile   = Total Operating Costs / Miles  ← includes fuel
```

Standards: integer **cents (BigInt)** for money, 3-decimal units for
miles/gallons, negative inputs rejected, missing ≠ zero, rounding only at
display time, USD.

## Getting started (local)

```bash
npm install                      # workspace install
npm run build -w @stratos/financial-engine
npm test                         # 19 golden financial tests (§15 fixture)

# Database — any PostgreSQL 14+ (Railway PostgreSQL in production)
export DATABASE_URL=postgresql://user:pass@localhost:5432/stratos
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

# API (port 3001)
cd apps/api
DATABASE_URL=... AUTH_SECRET=... WEB_ORIGIN=http://localhost:3000 \
API_URL=http://localhost:3001 APP_URL=http://localhost:3000 \
ADMIN_EMAILS=you@stratosfinancials.com PORT=3001 npx tsx src/server.ts

# Web (port 3000; proxies /api → :3001 automatically)
cd apps/web && npx vite
```

Environment templates: `apps/api/.env.example`, `apps/web/.env.example`.

### Integration smoke test (35 checks)

```bash
# with the API running against a database:
node apps/api/scripts/smoke.mjs http://localhost:3001
```

Covers: health, sign-up/sign-in, onboarding (client/truck/subscription),
plan limits (1 truck), golden §15 values end-to-end, duplicate prevention,
negative-input rejection, zero-mile/zero-gallon safety, fuel-edit propagation,
summary/history, two-account data isolation (cross-account read/write → 404),
admin role gating, support tickets, audit log, billing configuration state.

## Key behaviors

- **Data isolation:** every query is scoped to the session's `Client` row;
  cross-tenant access returns 404. Admin routes require `role = ADMIN`.
- **Duplicates:** DB unique constraint on `(truckId, reportingMonth)` + friendly 409.
- **Calculated totals are never stored** — derived by the engine on every read.
- **Admin bootstrap:** accounts listed in `ADMIN_EMAILS` are promoted on
  first authenticated request; roles are also manageable in the admin UI.
- **Stripe:** test mode only. Checkout (`/api/billing/checkout`), Customer
  Portal (`/api/billing/portal`), signature-verified webhook
  (`POST /webhooks/stripe`) with idempotent `StripeWebhookEvent` storage.
  Billing UI stays in "payments not configured" state until keys are set.
- **Feature gate:** `REQUIRE_ACTIVE_SUBSCRIPTION=true` (production) returns
  402 for accounts without an active/trialing subscription.
- **Reports:** printable sheet (Save as PDF) built from the same API metrics;
  header = official logo + full product name.

## Railway deployment (prepared, NOT deployed)

Each service has its own `railway.json`:

| Service | Root directory | Notes |
|---|---|---|
| `api` | `apps/api` | Nixpacks build; `prisma migrate deploy` on start; health check `/api/health` |
| `web` | `apps/web` | Static build served from `apps/web/dist` (`serve -s`) |
| PostgreSQL | Railway plugin | `DATABASE_URL` injected |

Suggested domains: `app.stratosfinancials.com` → web, `api.stratosfinancials.com` → api.

Required env vars (API): `DATABASE_URL`, `AUTH_SECRET`, `WEB_ORIGIN`
(comma-separated trusted origins incl. `https://app.stratosfinancials.com`),
`API_URL`, `APP_URL`, `STRIPE_SECRET_KEY` (test), `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_OWNER_OPERATOR`, `REQUIRE_ACTIVE_SUBSCRIPTION=true`,
`ADMIN_EMAILS`. Web: `VITE_API_URL` (or leave unset for same-origin `/api`).

**Deployment to Railway and live Stripe payments are intentionally not
performed until explicitly authorized by the client.**

## Plans

| Plan | Price | Trucks | Status |
|---|---|---|---|
| Owner-Operator | $20/mo | 1 | active |
| Small Fleet | $50/mo | up to 3 | seeded, inactive |
| Growing Fleet | $100/mo | up to 10 | seeded, inactive |

## Verification status

- `npm test` — 19/19 financial tests green (includes all 10 §15 scenarios)
- `npm run typecheck` — engine, API, web all clean
- `npm run build` — engine, API, web production builds green
- `node apps/api/scripts/smoke.mjs` — 35/35 integration checks green
