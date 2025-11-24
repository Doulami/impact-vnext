# Bundle Plugin - Cleanup Checklist

This document tracks deprecated fields and code that can be removed once the Product tab workflow is fully validated and the old standalone UI is no longer needed.

## Deprecated Bundle Entity Fields

These fields exist in the `Bundle` entity but are redundant with shell Product fields:

### ❌ To Remove from Bundle Entity (Phase 3 - Future)
- `slug` - ✅ Storefront now uses shell Product slug (fallback to bundle.slug)
- `description` - ✅ Storefront now uses shell Product description (fallback to bundle.description)
- `name` - ✅ Storefront now uses shell Product name (fallback to bundle.name)
- `assets` - Use shell Product assets instead (already removed from sync)
- `featuredAsset` - Use shell Product featured asset
- `tags` - Use shell Product facets/collections instead
- `category` - Use shell Product collections instead

**Note**: These fields can now be nullable/removed from Bundle entity since storefront uses shell Product fields with fallbacks.

### ✅ Keep in Bundle Entity
- `discountType` - Bundle-specific
- `fixedPrice` - Bundle-specific
- `percentOff` - Bundle-specific
- `validFrom` / `validTo` - Bundle schedule
- `bundleCap` - Bundle reservation limit
- `allowExternalPromos` - Bundle promo policy
- `status` - Bundle lifecycle state
- `shellProductId` - Reference to shell Product
- `items` - Bundle components

## Files/Code to Remove

### Old Standalone UI (Keep for debugging, don't maintain)
- ❌ `ui/bundle-nav.module.ts` - Navigation module for old UI
- ❌ `ui/bundle-ui.module.ts` - Old UI lazy module
- ❌ `ui/bundle-detail.component.ts` - Old bundle form
- ❌ `ui/bundle-detail.component.html` - Old bundle template
- ❌ `ui/bundle-list.component.ts` - Old bundle list
- ❌ `ui/bundle-list.component.html` - Old list template
- ❌ Route `/extensions/bundles` in `bundle-ui-extension.ts`

### Backend Code
- ❌ Lines 144-151 in `bundle.service.ts` - Asset fetching logic (not used)
- ❌ Lines 176-179 in `bundle.service.ts` - Saving deprecated fields to Bundle entity

### Database Columns (Schema migration needed)
After removing from TypeScript:
- ❌ `bundle.slug`
- ❌ `bundle.description`
- ❌ `bundle.tags`
- ❌ `bundle.category`
- Consider keeping `bundle.name` for reporting/debugging

## Migration Strategy

1. **Phase 1 (Current)**: Mark fields as DEPRECATED, keep in code
   - New UI doesn't use them
   - Old UI still works (not maintained)
   - Backend still accepts them (set to null/undefined)

2. **Phase 2 (After validation)**: Remove old UI
   - Delete old UI files
   - Remove route from extension config
   - Keep backend fields (for data integrity)

3. **Phase 3 (Future)**: Database cleanup
   - Create migration to drop columns
   - Remove fields from entity
   - Remove from input interfaces

## Current Status

✅ **New UI (Product Tab)**:
- Only uses active fields
- No deprecated fields in form
- Passes `shellProductId` for Product tab workflow

✅ **Backend**:
- Accepts deprecated fields (backward compat)
- New tab doesn't send them (saved as null)
- Marked as DEPRECATED in interfaces
- Asset sync removed from `syncBundleToShell()`

✅ **Storefront**:
- Updated to use `shellProduct.name/description/slug` with fallbacks to `bundle.*`
- No longer depends on Bundle entity fields for display
- Shell Product is source of truth for SEO/marketing content

⏳ **Old UI**:
- Still exists in codebase
- Not maintained
- Can be used for debugging if new UI has issues

## Notes

- The `name` field is kept because it's needed for the standalone UI and useful for logging
- Assets are completely decoupled - shell Product manages its own assets
- All SEO/marketing content should be managed on the shell Product, not the Bundle entity
