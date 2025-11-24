# Bundle Product Tab - Backend Changes Required

## Problem
The Bundle tab is now on Product detail page, not a standalone UI. Users create a Product first, then configure it as a bundle. The backend currently creates a NEW shell product during bundle creation, but we need to use the EXISTING product.

## Required Changes

### 1. Modify `CreateBundleInput` Interface
**File**: `apps/api/src/plugins/bundle-plugin/services/bundle.service.ts` (lines 24-41)

Add optional `shellProductId` field:
```typescript
export interface CreateBundleInput {
    name: string;
    slug?: string;
    description?: string;
    discountType: BundleDiscountType;
    fixedPrice?: number;
    percentOff?: number;
    validFrom?: Date;
    validTo?: Date;
    assets?: string[];
    tags?: string[];
    category?: string;
    allowExternalPromos?: boolean;
    items: CreateBundleItemInput[];
    
    // NEW: For Product tab workflow
    shellProductId?: string; // ID of existing Product to use as shell
    
    // Legacy fields for backwards compatibility
    price?: number;
    enabled?: boolean;
}
```

### 2. Modify `create()` Method Logic
**File**: `apps/api/src/plugins/bundle-plugin/services/bundle.service.ts` (lines 125-225)

**Current flow**:
1. Creates Bundle entity
2. Creates BundleItems
3. **Calls `createShellProduct()`** ← Problem
4. Saves shellProductId

**New flow** (after line 213):
```typescript
await this.connection.getRepository(ctx, BundleItem).save(bundleItems);

// Handle shell product
let shellProductId: string;
if (input.shellProductId) {
    // NEW: Use existing product from Product tab
    shellProductId = input.shellProductId;
    
    // Mark product as bundle
    await this.productService.update(ctx, {
        id: shellProductId,
        customFields: {
            isBundle: true,
            bundleId: String(savedBundle.id)
        }
    });
    
    Logger.info(`Marked existing product ${shellProductId} as bundle ${savedBundle.id}`, 'BundleService');
} else {
    // OLD: Create new shell product (for standalone bundle UI)
    shellProductId = await this.createShellProduct(ctx, savedBundle);
}

savedBundle.shellProductId = shellProductId;
await this.connection.getRepository(ctx, Bundle).save(savedBundle);

// Sync data to shell product (pricing, availability, components)
await this.syncBundleToShell(ctx, savedBundle);

const result = await this.findOne(ctx, savedBundle.id);
if (!result) {
    throw new Error('Failed to retrieve created bundle');
}
return result;
```

### 3. Verify `syncBundleToShell()` is Called
**File**: `apps/api/src/plugins/bundle-plugin/services/bundle.service.ts` (line 827)

The `syncBundleToShell()` method already:
- ✅ Updates Product customFields (bundlePrice, bundleAvailability, bundleComponents)
- ✅ Does NOT sync assets (confirmed removed at line 878-880)
- ✅ Works with existing shell products

**Action**: Add call to `syncBundleToShell()` after bundle creation (see code above)

### 4. Handle Product Variants
**Consideration**: Should we create a variant on the existing Product if it doesn't have one?

**Current `createShellProduct()`** (lines 249-259):
- Creates a single variant with `trackInventory=false`, `price=0`, `sku=BUNDLE-{id}`

**For existing Product**:
- Check if Product already has variants
- If yes, use first variant (or let user choose?)
- If no, create a variant similar to shell variant

**Recommendation**: Create a variant automatically if Product has no variants.

## Summary
1. Add `shellProductId?` to `CreateBundleInput`
2. Modify `create()` to handle both workflows:
   - With `shellProductId`: Mark existing Product as bundle
   - Without `shellProductId`: Create new shell Product (backward compat)
3. Call `syncBundleToShell()` after creation
4. Handle variant creation for existing Products

## Testing
- Test CREATE with existing Product (new tab workflow)
- Test CREATE without shellProductId (old standalone UI)
- Test UPDATE to ensure recompute/sync still works
- Verify both workflows don't break each other
