# Bundle Product Tab Refactor - Complete

## Summary
Successfully refactored Bundle plugin UI to integrate as a Product detail page tab, and cleaned up all deprecated fields from storefront GraphQL queries.

## Changes Made

### 1. Backend (`apps/api/src/plugins/bundle-plugin`)

**`services/bundle.service.ts`**:
- Added `shellProductId` to `CreateBundleInput` interface
- Modified `create()` method to support two workflows:
  - **Product tab**: Uses existing Product as shell, marks it as bundle
  - **Standalone UI**: Creates new shell Product (not maintained)
- Calls `syncBundleToShell()` on both CREATE and UPDATE for recompute
- Marked deprecated fields (`slug`, `description`, `assets`, `tags`, `category`) in interfaces

### 2. Admin UI (`apps/api/src/plugins/bundle-plugin/ui`)

**New Product Tab Components**:
- `bundle-variant-tab-providers.ts`: Registers tab on `product-detail` (not variant)
- `bundle-variant-tab.component.ts`: Tab container with product context, blocks unsaved products
- `bundle-variant-detail.component.ts`: Clean form with only active fields

**Removed Fields from UI**:
- ❌ name (uses Product name)
- ❌ slug (uses Product slug)  
- ❌ description (uses Product description)
- ❌ assets (uses Product assets)
- ❌ tags (uses Product collections)
- ❌ category (uses Product collections)

**Active Fields**:
- ✅ discountType (fixed/percent)
- ✅ fixedPrice / percentOff
- ✅ validFrom / validTo
- ✅ bundleCap
- ✅ allowExternalPromos
- ✅ items (bundle components)

### 3. Storefront (`apps/web/src`)

**GraphQL Queries** (`lib/graphql/`):
- `queries.ts`: Removed `name`, `slug`, `description`, `assets`, `featuredAsset` from BUNDLE_FRAGMENT
- `bundles.ts`: Removed deprecated fields from GET_BUNDLE_SHELL
- All queries now use `shellProduct { name, slug, description, featuredAsset }`

**React Components**:
- `useCombinedSearch.ts`: Uses `shellProduct` fields, removed `bundle` field fallbacks
- `ui-extensions.tsx`: Uses `shellProduct` fields for bundle opportunities
- `RelatedProducts.tsx`: Uses `shellProduct` fields for bundle display

## Architecture

```
Product (Shell)
├── customFields.isBundle = true
├── customFields.bundleId = "123"
├── name, slug, description ← Source of truth
├── featuredAsset, assets
└── variants[0] (shell variant, trackInventory=false)

Bundle Entity
├── id
├── discountType, fixedPrice, percentOff
├── validFrom, validTo, bundleCap
├── allowExternalPromos
├── shellProductId → Product.id
└── items[] (bundle components)
```

## Data Flow

**CREATE Bundle** (Product Tab):
1. User creates Product, saves it
2. User clicks Bundle tab
3. Configures bundle settings
4. Save → Backend:
   - Creates Bundle entity
   - Marks Product as `isBundle=true`, `bundleId=X`
   - Creates variant if Product has none
   - Calls `syncBundleToShell()` (computes price, availability, components)

**UPDATE Bundle**:
1. User edits bundle settings
2. Save → Backend:
   - Updates Bundle entity
   - Updates items
   - Calls `syncBundleToShell()` (recompute)

**Storefront Display**:
1. Query bundles with `shellProduct { name, slug, description, featuredAsset }`
2. Display uses shell Product fields (SEO, marketing content)
3. Bundle entity provides discount/availability logic

## Deprecated Fields Status

| Field | Backend | Admin UI | Storefront | Can Remove |
|-------|---------|----------|------------|------------|
| `name` | Kept | Not used | **Removed** | Phase 3 |
| `slug` | Kept | Not used | **Removed** | Phase 3 |
| `description` | Kept | Not used | **Removed** | Phase 3 |
| `assets` | Kept | Not used | **Removed** | Phase 3 |
| `featuredAsset` | Kept | Not used | **Removed** | Phase 3 |
| `tags` | Kept | Not used | Never used | Phase 3 |
| `category` | Kept | Not used | Never used | Phase 3 |

**Phase 3** (Future): Create database migration to drop these columns from `bundle` table.

## Testing Checklist

- [ ] CREATE bundle via Product tab
- [ ] UPDATE bundle via Product tab
- [ ] Verify `syncBundleToShell()` runs on save
- [ ] Check Product customFields updated (`isBundle`, `bundleId`, `bundlePrice`, `bundleAvailability`)
- [ ] Storefront displays bundle with shell Product name/description/slug
- [ ] Search works with bundle names
- [ ] Related products show bundles correctly
- [ ] Bundle opportunities display correctly

## Documentation

- `BUNDLE_CLEANUP_CHECKLIST.md`: Tracks deprecated fields and removal plan
- `BUNDLE_TAB_BACKEND_CHANGES.md`: Backend implementation details
- This file: Complete refactor summary

## Notes

- Old standalone UI (`/extensions/bundles`) still exists but is NOT maintained
- Shell Product is now the single source of truth for all SEO/marketing content
- Bundle entity only stores discount logic and scheduling
- All deprecated field references removed from storefront - clean break, no fallbacks
