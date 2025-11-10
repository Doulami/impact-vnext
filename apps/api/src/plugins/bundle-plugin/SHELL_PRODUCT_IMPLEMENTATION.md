# Shell Product Auto-Creation Implementation

## Problem
Bundles are created without shell products, causing `addBundleToOrder` to fail because it can't find a shell variant for the header line.

## Solution
Auto-create a shell Product when creating a bundle, with:
- `customFields.isBundle = true`
- `customFields.bundleId = <bundle ID>`
- Single variant with `trackInventory = false`
- Store `shellProductId` on Bundle entity

## Changes Needed

### 1. Bundle Entity (✅ DONE)
Added `shellProductId` field to track the shell product.

### 2. Bundle Service
Need to add `ProductService` to constructor and create method `createShellProduct()`:

```typescript
// In constructor, add:
private productService: ProductService,

// Add method:
private async createShellProduct(
    ctx: RequestContext,
    bundle: Bundle
): Promise<ID> {
    // Create Product with bundle metadata
    const product = await this.productService.create(ctx, {
        translations: [{
            languageCode: LanguageCode.en,
            name: `${bundle.name} (Bundle)`,
            slug: bundle.slug || `bundle-${bundle.id}`,
            description: bundle.description || `Bundle: ${bundle.name}`
        }],
        customFields: {
            isBundle: true,
            bundleId: bundle.id
        }
    });
    
    // Create single variant with trackInventory=false
    const variant = await this.productVariantService.create(ctx, [{
        productId: product.id,
        sku: `BUNDLE-${bundle.id}`,
        price: 0, // Shell has no price
        trackInventory: false,
        translations: [{
            languageCode: LanguageCode.en,
            name: bundle.name
        }]
    }]);
    
    return product.id;
}
```

### 3. Update `create()` method
After saving bundle, create shell product and link it:

```typescript
// After line 172 (savedBundle = ...)
const shellProductId = await this.createShellProduct(ctx, savedBundle);
savedBundle.shellProductId = shellProductId;
await this.connection.getRepository(ctx, Bundle).save(savedBundle);
```

### 4. Update `findShellProduct()`
Use `bundle.shellProductId` instead of querying by customFields:

```typescript
private async findShellProduct(ctx: RequestContext, bundleId: ID): Promise<Product | null> {
    const bundle = await this.findOne(ctx, bundleId);
    if (!bundle || !bundle.shellProductId) {
        return null;
    }
    
    return this.connection.getRepository(ctx, Product).findOne({
        where: { id: bundle.shellProductId },
        relations: ['variants']
    });
}
```

### 5. Database Migration
Need to run migration for `shellProductId` field:

```bash
npm run migration:generate -- add-shell-product-id-to-bundle
npm run migration:run
```

### 6. Admin UI Updates
Show shell product info in bundle detail view with "Edit Product" link.

## Testing
1. Create bundle → shell product created automatically
2. Publish bundle → shell product remains linked
3. Add to cart → uses shell variant for header line
4. Query bundle → shell product ID visible

## Current Status
- ✅ Entity updated with shellProductId field
- ⏳ Need to add ProductService injection
- ⏳ Need to implement createShellProduct() method
- ⏳ Need to update create() to call createShellProduct()
- ⏳ Need to update findShellProduct() to use shellProductId
- ⏳ Need database migration
- ⏳ Need Admin UI updates
