# Impact Nutrition E-commerce Platform 🏋️‍♂️

A modern, full-stack e-commerce solution for sports nutrition products, built with Next.js 16 and Strapi 5.

![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC)
![Strapi](https://img.shields.io/badge/Strapi-5.3-8E75FF)

## ✨ Completed Features

### 🛒 **Shopping Cart System** (Ready for Production)
- **Smart Cart Dropdown**: Click-to-open with product preview and quick actions
- **Persistent Storage**: Cart survives browser sessions with localStorage
- **Smooth Animations**: Drawer slides, badges zoom, professional UX
- **Full Cart Page**: Desktop experience with quantity management
- **Real-time Updates**: Live totals, item counts, and inventory status
- **Mobile Optimized**: Touch-friendly interface across all devices

### 🏪 **Product Catalog** 
- **Product Listing Page**: Advanced filtering, sorting, and search
- **Product Detail Pages**: Variant selection, image galleries, reviews
- **Smart Buttons**: "ADD TO CART" vs "CHOOSE OPTIONS" based on variants
- **GraphQL Integration**: Real-time data from Vendure e-commerce platform
- **SEO Optimized**: Dynamic meta tags, structured data, performance

### 📝 **Content Management**
- **Strapi CMS**: Headless content management with admin dashboard
- **Article System**: Blog functionality with rich content editing
- **Media Management**: Image uploads, optimization, and delivery
- **TypeScript Integration**: Generated types for type-safe development

## 🚀 Quick Start

```bash
git clone https://github.com/Doulami/impact-vnext.git
cd impact-vnext
npm install
npm run dev
```

**That's it!** 🎉
- **Web App**: http://localhost:3000 - Full e-commerce experience
- **CMS Admin**: http://localhost:1337/admin - Content management

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

## 🛠 Available Scripts

### Development
```bash
npm run dev          # Start all services (Web + CMS)
npm run dev:web      # Start Next.js frontend only  
npm run dev:cms      # Start Strapi CMS only
```

### Production
```bash
npm run build        # Build all applications
npm run start        # Start production servers
npm run lint         # Lint all code
```

### Maintenance
```bash
npm run clean        # Clean build artifacts
npm run install:all  # Reinstall all dependencies
```

## 📚 Documentation

- **[📋 Installation Guide](./docs/INSTALLATION.md)** - Complete setup instructions for new developers
- **[🛍 Web App Development](./apps/web/WARP.md)** - Frontend development guide and patterns
- **[📝 CMS Development](./apps/cms/WARP.md)** - Backend content management guide

## 🚨 Troubleshooting

**Port conflicts:**
```bash
lsof -ti:3000 | xargs kill -9  # Kill Next.js
lsof -ti:1337 | xargs kill -9  # Kill Strapi
```

**Build issues:**
```bash
npm run clean && npm install && npm run dev
```

## 🏆 Built With

- **[Next.js](https://nextjs.org/)** - React framework for production
- **[Strapi](https://strapi.io/)** - Open-source headless CMS  
- **[TypeScript](https://www.typescriptlang.org/)** - Typed JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS
- **[Apollo GraphQL](https://www.apollographql.com/)** - GraphQL client
- **[Vendure](https://www.vendure.io/)** - E-commerce framework

---

**Ready to build amazing e-commerce experiences!** 🚀
