# Bundle Pricing Guardrails

## Overview
This document describes the guardrails implemented to prevent admins from breaking bundle pricing by manually editing variant prices or bundle custom fields.

## Implementation Status

### ✅ Completed

#### Part A: Bundle Activation Button
**Location**: `ui/bundle-variant-tab.component.ts`
- Added "Activate Bundle for this Product" button for non-bundle products
- Button calls `updateProduct` mutation to set `customFields.isBundle = true`
- Automatically navigates to bundle creation form after activation
- Uses NotificationService for success/error feedback

#### Part E: Custom Field Locking
**Location**: `vendure-config.ts` lines 84-136
- Made the following Product custom fields readonly in Admin UI:
  - `bundleId` - managed by Bundle plugin
  - `bundlePrice` - synced from Bundle calculation
  - `bundleAvailability` - synced from Bundle calculation
  - `bundleComponents` - synced from Bundle plugin
- `isBundle` remains editable for manual activation (but managed via Bundle tab activation button)
- All readonly fields show description: "Managed by Bundle plugin – see Bundle tab"
- Fields use `ui: { component: 'readonly-text-form-input' }` for visual indication

### ⏳ To Be Implemented

#### Part B: Variant Price UI Guards
**Goal**: Disable price input for bundle shell variants in Product Variant detail form

**Challenge**: Vendure's core admin UI components are in `@vendure/admin-ui` package, not in this codebase. Need to create a UI extension that:
1. Detects when editing a variant whose parent Product has `customFields.isBundle = true`
2. Disables the price input field
3. Shows inline hint: "Price is calculated by the bundle. To change it, edit the bundle configuration on the Bundle tab."

**Approach Options**:
1. Create custom form input component for ProductVariant price field
2. Use Vendure's `registerFormInputComponent` API to override price input for bundle shells
3. Add custom CSS/JS to hide/disable price field when product is a bundle

**Recommended**: Option 2 - register a custom form input component that wraps the default price input with conditional logic.

#### Part C: Toast Notifications for Guard Violations
**Goal**: Show toast notification when user attempts to edit protected fields

**Current State**: NotificationService is already injected in bundle-variant-tab component and used for activation success/error.

**Next Steps**:
1. Add interceptor in variant detail form (if we create custom component for Part B)
2. Show warning toast if price change is detected on bundle shell
3. Toast message: "Bundle price can't be edited directly. Your change was ignored. Update the Bundle configuration instead."

#### Part D: Backend Price Update Guards
**Goal**: Enforce on backend that only `syncBundleToShell()` can set shell variant price

**Current State**: 
- `syncBundleToShell()` is called after bundle create/update operations
- Already overwrites shell variant price with bundle-calculated price
- Shell variant price is set via ProductVariantService

**Options**:
1. **Simple**: Ensure `syncBundleToShell()` runs after ANY Product/Variant update
2. **Robust**: Create Vendure event listener for `ProductVariantEvent` and auto-sync
3. **Strict**: Add custom resolver to intercept `updateProductVariants` mutation

**Recommended**: Option 2 - listen to ProductVariantEvent and call syncBundleToShell() if variant belongs to bundle shell.

**Implementation**:
```typescript
// In bundle-event-handlers.service.ts
import { ProductVariantEvent } from '@vendure/core';

// Subscribe to variant updates
this.eventBus.ofType(ProductVariantEvent).subscribe(async (event) => {
  // Check if variant's parent Product is a bundle shell
  const product = await this.productService.findOne(event.ctx, event.entity.productId);
  if (product?.customFields?.isBundle && product.customFields?.bundleId) {
    // Fetch bundle and re-sync to shell
    const bundle = await this.bundleService.findOne(event.ctx, product.customFields.bundleId);
    if (bundle) {
      await this.bundleService.syncBundleToShell(event.ctx, bundle);
      Logger.info(`Re-synced bundle ${bundle.id} to shell after variant update`, 'BundlePricingGuard');
    }
  }
});
```

## Testing

### Manual Test Cases
1. ✅ Create Product → navigate to Bundle tab → see activation button
2. ✅ Click activation → Product becomes bundle → form appears
3. ✅ Verify custom fields (bundleId, bundlePrice, bundleAvailability, bundleComponents) are readonly in Product detail form
4. ⏳ Try to edit shell variant price → field should be disabled with hint
5. ⏳ Attempt API call to change shell variant price → price should be overwritten by next sync
6. ✅ Verify normal (non-bundle) product price editing still works

### Automated Test Cases (Future)
- Unit test: Custom field readonly validation
- E2E test: Bundle activation flow
- E2E test: Variant price guard behavior
- Integration test: Backend price sync enforcement

## Architecture Decisions

### Decision: Sync shell Product fields to Bundle entity as cache
**Rationale**: Backend code uses `bundle.name` in 50+ places. Rather than refactor all files, we sync Product fields (name/slug/description) to Bundle entity as a cache. Product is source of truth, Bundle stores snapshot.

**Implementation**: 
- CREATE: sync in `bundle.service.ts` lines 246-250
- UPDATE: sync in `bundle.service.ts` lines 399-407

### Decision: Keep custom fields public but readonly
**Rationale**: Storefront needs access to these fields via Shop API. Making them `internal: true` would break storefront queries. Instead, make them `readonly: true` in Admin UI while keeping `public: true` for Shop API.

### Decision: Price enforcement via sync, not mutation interception
**Rationale**: Simpler and more maintainable to let admins "change" the price, then immediately overwrite it via `syncBundleToShell()` triggered by event listener. This avoids complex mutation interception logic and provides clear audit trail.

## Future Improvements
1. Add custom ProductVariant price form input component that's bundle-aware
2. Add real-time validation feedback in variant detail form
3. Add Admin UI notification when bundle prices are automatically corrected
4. Add permission-based access control (SuperAdmin-only for bundle custom fields)
5. Add audit log for price override events
