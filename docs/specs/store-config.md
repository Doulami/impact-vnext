# StoreConfig Specification

## Overview
**StoreConfig** is a Strapi single-type collection containing all feature flags, branding settings, and content references. It acts as the single source of truth for feature toggles read by both the API and web storefront.

## Fields

### Features Group (Boolean Toggles)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `payments.gpgEnabled` | Boolean | `true` | Enable GPG Checkout as a payment method |
| `shipping.fileBridgeEnabled` | Boolean | `false` | Enable automated file-based shipping export |
| `promotions` | Boolean | `false` | Enable discount & promotion engine |
| `bundles` | Boolean | `false` | Enable multi-product bundle functionality |
| `loyalty` | Boolean | `false` | Enable loyalty earn/burn points |
| `search.meiliEnabled` | Boolean | `false` | Enable Meilisearch-powered search (vs. fallback) |
| `analytics.enabled` | Boolean | `false` | Enable GA / Tawk analytics integration |
| `pwa.enabled` | Boolean | `false` | Enable PWA install prompt & offline features |
| `cache.edgeEnabled` | Boolean | `false` | Enable Cloudflare surrogate key purge logic |

### Branding Group

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `siteName` | String | "Impact Nutrition" | Primary site name |
| `primaryColor` | String (hex) | "#FF6B35" | Brand primary color |
| `logoUrl` | String (URL) | "https://cdn.../logo.png" | Logo image URL |
| `socialLinks` | JSON | Array of {platform, url} | Social media links (Facebook, Instagram, etc.) |

### Search Group

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `meiliHost` | String | "https://search.example.com" | Meilisearch host (used if `search.meiliEnabled`) |
| `meiliIndexPrefix` | String | "prod_" | Index name prefix (e.g., "prod_products") |

### Cache Group

| Field | Type | Example | Description |
|-------|------|---------|-------------|
| `edgePurgeEnabled` | Boolean | `true` | Allow surrogate key purge on catalog changes |

### Content Hooks Group (References)

| Field | Type | Refs | Description |
|-------|------|------|-------------|
| `promoBars` | Component (Repeatable) | Custom blocks | Homepage / page-specific promo banners |
| `headerMenu` | Reference Collection | Navigation items | Top navigation menu |
| `footerMenu` | Reference Collection | Navigation items | Footer menu & links |

## Flag Semantics & Fallbacks

### payments.gpgEnabled
- **ON**: GPG Checkout payment method displayed in checkout.
- **OFF**: Payment method not shown; order uses fallback or is rejected with "no payment method available" error message.
- **Fallback UX**: Show alternative payment method or require manual capture.

### shipping.fileBridgeEnabled
- **ON**: Orders transition to "Ready to Ship" → automatically batched and exported to file.
- **OFF**: Orders remain in "Pending Fulfillment"; no automatic export triggered. Operators must manually initiate or use alternate fulfillment workflow.
- **Fallback**: Manual export via admin panel or disable shipping entirely.

### promotions
- **ON**: Discount engine active; promotions applied at checkout.
- **OFF**: No discounts calculated; products shown at list price. Promo UI (badges, discount % display) hidden.
- **Fallback**: Standard pricing applies; no promotional discount applied.

### bundles
- **ON**: Bundle products listed & purchasable; bundle rules applied.
- **OFF**: Bundles not shown; component SKUs sold individually at standard price.
- **Fallback**: Browse & cart work normally; bundle page 404.

### loyalty
- **ON**: Loyalty earn rule active (% per order); burn rule active at checkout; account shows balance & history.
- **OFF**: No earn/burn calculation; no loyalty UI surfaces shown.
- **Fallback**: Loyalty section not rendered; order finalization unchanged.

### search.meiliEnabled
- **ON**: Full-text search via Meilisearch with typo tolerance, synonyms, ranking.
- **OFF**: Search falls back to API filter on title, SKU, tags with exact/contains matching. UX is slower but acceptable.
- **Fallback**: `/search` page still renders; results from basic API queries.

### analytics.enabled
- **ON**: GA & Tawk scripts loaded; events tracked.
- **OFF**: No third-party scripts; telemetry optional.
- **Fallback**: Web app runs without analytics; no visitor data collected.

### pwa.enabled
- **ON**: PWA install prompt shown; offline fallback pages available.
- **OFF**: Web app behaves like normal website; no install prompt.
- **Fallback**: Service worker & manifest still present; install not actively promoted.

### cache.edgeEnabled
- **ON**: Cloudflare surrogate keys used; smart purge on catalog changes.
- **OFF**: Standard Cache-Control headers; manual purge or TTL-based expiry.
- **Fallback**: Cache still active; just not invalidated via surrogate keys.

## API Integration

### Reading Flags (feature-flags SDK)
```
// Example usage in API / Web
const flags = await getStoreConfig();
if (flags.features.payments.gpgEnabled) {
  // Load GPG checkout handler
}
```

### Caching
- StoreConfig fetched on API startup and cached for 5–10 minutes
- Web app fetches via API GraphQL query on init; browser cache 30 min
- Force refresh: manual cache clear in Strapi admin or via API invalidation endpoint

## Content Management
- **Editor access**: Strapi admin interface
- **Versioning**: Use Strapi's draft/publish workflow; publish to live
- **Audit**: Enable Strapi audit trail plugin for flag changes
