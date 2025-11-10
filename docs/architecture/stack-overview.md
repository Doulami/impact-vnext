# Stack Overview

## Responsibility Split

### apps/api (Vendure)
- **Catalog**: products, collections, variants, pricing, inventory
- **Orders**: cart, checkout, order lifecycle, fulfillment state transitions
- **Payments**: payment provider integration hooks; webhook handlers
- **Plugins**: custom extensions for loyalty, shipping, search reindexing
- **API style**: GraphQL-first (Shop & Admin schemas); small REST endpoints for webhooks/exports only
- **Features**: conditional module loading via feature flags (payments, shipping, loyalty, search)

### apps/web (Next.js)
- **Pages**: PLP, PDP, cart, checkout, account, content pages
- **PWA**: manifest, service worker, install prompt (flag-gated)
- **SEO**: structured data, OG tags, sitemaps
- **Styling**: responsive, mobile-first
- **Data**: GraphQL queries to Vendure API; static props/ISR where appropriate
- **Feature toggles**: all feature flags read from Strapi and conditionally render UI (hide/show payment methods, loyalty, search)

### apps/cms (Strapi)
- **StoreConfig**: single-type containing all feature flags and branding settings
- **Content**: promo bars, header/footer menus (reference collections)
- **Blocks**: hero, featured products, testimonials, FAQ (managed by editors)
- **Editorial**: user-friendly content management for non-developers
- **Dependencies**: CMS comes AFTER API/Web are established; provides feature flags with env fallbacks until ready

## Feature Flags & Graceful Fallback

All flags defined in Strapi **StoreConfig** (see [Store Config Spec](../specs/store-config.md)).

### Fallback Behavior Table

| Flag | When OFF | UI Impact | Core Impact |
|------|----------|-----------|-------------|
| `payments.gpgEnabled` | Payment method hidden | Checkout shows only available methods | Order can use standard/fallback payment |
| `shipping.fileBridgeEnabled` | No auto-export | Orders stay "Pending Fulfillment" | Manual fulfillment still possible |
| `promotions` | No discounts applied | No promo badge/display | Products at standard price |
| `bundles` | Bundle pages hidden | Bundles not listed | Component SKUs sold individually |
| `loyalty` | No earn/burn calc | Account page has no loyalty section | No loyalty ledger updates |
| `search.meiliEnabled` | Falls back to API filter | Search uses basic title/SKU/tag | Same results, slower but acceptable |
| `analytics.enabled` | No GA/Tawk | No tracking scripts | Local telemetry off |
| `pwa.enabled` | No install prompt | Normal web app | Manifest & SW still cached |
| `cache.edgeEnabled` | No surrogate key purge | Standard Cache-Control headers | Manual purge or TTL expiry |

**Core guarantee**: Browse → Cart → Pay always works. Optional features degrade safely.

## Data Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                        STOREFRONT (Next.js)                      │
│ - PLP / PDP / Cart / Checkout / Account                         │
│ - Reads flags from Strapi (via feature-flags SDK)               │
└────────────────────────┬────────────────────────────────────────┘
                         │ GraphQL (Shop API)
                         │ REST (webhooks, polling)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API (Vendure)                               │
│ - Catalog, pricing, inventory                                   │
│ - Cart, orders, fulfillment                                     │
│ - Payment & shipping webhooks                                   │
│ - Plugins: loyalty, search reindex, file export                 │
└───┬────────────────┬────────────────┬────────────────┬───────────┘
    │                │                │                │
    │ Read flags     │ Webhooks       │ Export orders  │ Write events
    │ (init)         │ (authorize,    │ to file        │ (loyalty ledger,
    │                │  capture,      │ (scheduled)    │  search queue)
    │                │  failed)       │                │
    ▼                │                │                │
┌──────────────────┐ │     ┌──────────────────────┐    │
│  CMS (Strapi)    │ │     │ GPG Checkout         │    │
│ - StoreConfig    │ │     │ (external payment)   │    │
│   (all flags)    │ │     └──────────────────────┘    │
│ - Content blocks │ │                                  │
└──────────────────┘ │     ┌──────────────────────┐    │
                     │     │ Shipping Remote      │    │
                     │     │ (SFTP / HTTPS)       │    │
                     │     └──────────────────────┘    │
                     │                                  │
                     └──────────────────────────────────┘
```

### Request Patterns
- **Web → API**: GraphQL queries (catalog, cart, orders)
- **API ↔ CMS**: REST to read StoreConfig flags (caches 5–10 min)
- **API → External**: GPG POST (authorize, webhook); Shipping file upload (SFTP/HTTPS)
- **CMS → Web**: Static generation or ISR pulls content blocks; flags cached in browser (optional)

## Performance Plan

### Web (Next.js)
- **ISR**: product & collection pages revalidate on inventory/price changes
- **Route cache hints**: PDP, PLP with 60s max-age; cart/checkout no-cache
- **Images**: Next Image optimization, responsive srcsets
- **Bundle**: code splitting per route, tree-shaking

### API (Vendure)
- **Redis**: cache catalog queries (60s), basket calculations (TTL varies)
- **Fallback**: in-memory cache if Redis unavailable
- **No-cache endpoints**: current cart, checkout state, customer session

### Edge Cache (Cloudflare, planned via cache-edge package)
- **Surrogate keys**: per product, collection, category
- **Purge hooks**: API plugins trigger purge on product/inventory change
- **RUM**: Core Web Vitals monitoring; target <75ms LCP on PDP, <100ms FCP

## Module Interdependencies

- **feature-flags SDK**: used by web & API to read Strapi StoreConfig
- **payments-gpg SDK**: loaded by API only; exposes checkout handlers
- **shipping-file SDK**: API plugin; triggers on order ready
- **loyalty SDK**: API plugin; calculates earn/burn per flag
- **cache-edge SDK**: API plugin (optional); purge hooks on catalog changes
- **search SDK**: planned; reindex on product change if Meili enabled

## Execution Dependencies (Corrected)

**API/Web have NO dependency on CMS to start:**
- Vendure can initialize with demo data independently
- Next.js can run with hardcoded/demo content initially  
- Environment variable fallbacks handle missing Strapi flags

**CMS depends on API/Web existing:**
- Strapi provides feature flags consumed by existing API/Web
- Content integration requires working API/Web foundation

**Admin UI depends on all prior systems:**
- Admin UI is LAST and depends on all features being implemented
- Provides management interface for existing functionality
