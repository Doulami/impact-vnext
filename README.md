# impact-vnext

Modern composable commerce stack: **Vendure** (Node/TS) + **Next.js** (App Router) + **Strapi** CMS.

## Stack
- **Backend**: Vendure (GraphQL Shop/Admin APIs, plugins)
- **Storefront**: Next.js 14+ (App Router, PWA)
- **CMS**: Strapi (content blocks, feature flags via StoreConfig)
- **Support**: Redis (optional; in-memory fallback), Meilisearch (optional search), Cloudflare (optional edge cache)

## Priorities
1. **Storefront + Payments + Shipping** (core revenue flow)
2. Loyalty, Search, Performance, PWA
3. Admin UI elevation (last)

Core principle: **Browse → Cart → Pay must work even if any optional feature is OFF.**

## Feature Flags

All flags live in Strapi **StoreConfig** (single-type); read by both API and web via feature-flags SDK.

| Flag | Purpose | Default | Graceful Fallback |
|------|---------|---------|-------------------|
| `payments.gpgEnabled` | GPG Checkout payment method | `true` | Hides GPG UI; checkout uses fallback or disabled |
| `shipping.fileBridgeEnabled` | File-based shipping export | `false` | Orders remain "Pending Fulfillment" until manual action |
| `promotions` | Discount engine | `false` | No promotions applied; products shown at standard price |
| `bundles` | Multi-product bundles | `false` | Bundles not shown; component SKUs sold individually |
| `loyalty` | Earn/burn points | `false` | No loyalty surfaces; no earn/burn calculation |
| `search.meiliEnabled` | Meilisearch-powered search | `false` | Falls back to title/SKU/tag API filter (acceptable UX) |
| `analytics.enabled` | GA / Tawk integration | `false` | No third-party scripts; local telemetry optional |
| `pwa.enabled` | PWA install prompts & offline | `false` | Normal web app; manifest & SW still present |
| `cache.edgeEnabled` | Cloudflare surrogate keys & purge | `false` | Standard Cache-Control; no smart invalidation |

**Fallback guarantee**: If all flags are OFF, storefront still runs core catalog browsing, cart, and checkout with a basic payment method.

## Milestones

- **M1**: API & Web shells up (Vendure and Next.js initialized; no CMS dependency) ✓
- **M2**: Vendure minimal config + DB connection (Shop/Admin endpoints reachable)
- **M3**: Web page scaffolds (Home, Search, PLP, PDP, Cart, Checkout, Account) using demo/sample data
- **M4**: Strapi setup (StoreConfig feature flags + branding), with env fallbacks documented
- **M5**: Payments: GPG Checkout integration (hosted redirect + webhooks)
- **M6**: Shipping file bridge (batch export + remote push + retries)
- **M7**: Loyalty (earn/burn, ledger, refund adjustments), with OFF-state behavior
- **M8**: Search & Performance (Meilisearch ON/OFF, Redis vs in-memory, Cloudflare notes) + PWA baseline
- **M9**: Content & SEO (Strapi pages, menus, promo blocks, legal pages)
- **M10**: Admin UI elevation (dashboard cards, ops views, exports) — explicitly LAST
- **M11**: QA & Cutover checklist (feature-flag ON/OFF matrix; mobile CWV; go-live steps)

See [Milestones & Acceptance Criteria](docs/architecture/milestones-and-acceptance.md).

## Project Map

```
impact-vnext/
├── apps/
│   ├── api/          → Vendure backend (GraphQL Shop/Admin APIs, plugins)
│   ├── web/          → Next.js storefront (PWA, pages)
│   └── cms/          → Strapi CMS (content + StoreConfig flags)
├── packages/
│   ├── feature-flags/    → SDK to read flags from Strapi StoreConfig
│   ├── payments-gpg/     → GPG Checkout payment provider
│   ├── shipping-file/    → File-export shipping bridge
│   ├── loyalty/          → Loyalty earn/burn module
│   ├── cache-edge/       → Cloudflare cache hints + purge hooks
│   ├── fb-feed/          → Facebook catalog feed exporter
│   └── erp-sync/         → ERP/CRM sync adapter
└── docs/
    ├── architecture/  → Stack overview, milestones
    ├── specs/         → Feature & API specifications
    └── runbooks/      → Operations & QA procedures
```

## Getting Started

1. Copy `.env.example` to `.env` and populate with local/staging keys.
2. Install and run each app (see app READMEs).
3. Check [Architecture Overview](docs/architecture/stack-overview.md) for data flows.
4. Review [Storefront Page Map](docs/specs/storefront-page-map.md) for routes.

## Documentation Index

- **Architecture**: [Stack Overview](docs/architecture/stack-overview.md), [Milestones & Acceptance](docs/architecture/milestones-and-acceptance.md)
- **Specs**: [StoreConfig](docs/specs/store-config.md), [Storefront Pages](docs/specs/storefront-page-map.md), [GPG Payments](docs/specs/payment-gpg.md), [Shipping Bridge](docs/specs/shipping-file-bridge.md), [Loyalty](docs/specs/loyalty.md), [Search](docs/specs/search.md), [Perf & PWA](docs/specs/perf-and-pwa.md), [Admin UI](docs/specs/admin-ui-elevation.md)
- **Operations**: [Ops Runbook](docs/runbooks/ops.md), [QA Checklist](docs/runbooks/qa-checklist.md)
