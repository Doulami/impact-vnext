# Bundle Asset Management Implementation Guide

**Date**: November 10, 2025  
**Version**: Bundle Plugin v2.1  
**Status**: ✅ Production Ready

---

## Overview

The Bundle Plugin now features complete asset management with proper many-to-many relations, featured asset support, and automatic synchronization to shell products. This implementation follows Vendure's standard asset patterns used in Product entities.

---

## Architecture

### Entity Structure

```typescript
@Entity()
export class Bundle extends VendureEntity {
    // ... other fields
    
    @ManyToMany(() => Asset, { eager: true })
    @JoinTable({
        name: 'bundle_assets',
        joinColumn: { name: 'bundle_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'asset_id', referencedColumnName: 'id' }
    })
    assets: Asset[];

    @ManyToOne(() => Asset, { nullable: true, eager: true })
    featuredAsset?: Asset;
}
```

### Database Schema

**bundle_assets** (junction table):
- `bundle_id` (integer, FK → bundle.id)
- `asset_id` (integer, FK → asset.id)
- Primary key: (bundle_id, asset_id)
- Indexes: `IDX_bundle_assets_bundle_id`, `IDX_bundle_assets_asset_id`

**bundle** table:
- `featuredAssetId` (integer, FK → asset.id, nullable)
- Index: `IDX_bundle_featuredAssetId`

### Migration

The migration `1731252000000-bundle-asset-relations.ts` handles:
1. Creating `bundle_assets` junction table
2. Adding `featuredAssetId` column to bundle
3. Setting up foreign key constraints with CASCADE delete
4. Creating performance indexes
5. Dropping deprecated `assets: string[]` and `image: string` columns

---

## GraphQL API

### Bundle Type

```graphql
type Bundle implements Node {
    id: ID!
    name: String!
    # ... other fields
    
    assets: [Asset!]!
    featuredAsset: Asset
    effectivePrice: Money!
    totalSavings: Money!
    status: String!
}
```

### Create/Update Inputs

```graphql
input CreateBundleInput {
    name: String!
    # ... other fields
    assets: [ID!]  # Array of asset IDs
}

input UpdateBundleInput {
    id: ID!
    # ... other fields
    assets: [ID!]  # Array of asset IDs
}
```

### Usage Example

```graphql
mutation CreateBundle {
    createBundle(input: {
        name: "Performance Stack"
        assets: ["1", "2", "3"]  # Asset IDs
        items: [...]
    }) {
        id
        name
        assets {
            id
            preview
        }
        featuredAsset {
            id
            preview
        }
    }
}
```

---

## Backend Implementation

### Bundle Service

#### Create Operation

```typescript
async create(ctx: RequestContext, input: CreateBundleInput): Promise<Bundle> {
    // Convert asset IDs to Asset entities
    let assetEntities: Asset[] = [];
    let featuredAsset: Asset | undefined;
    
    if (input.assets && input.assets.length > 0) {
        assetEntities = await this.connection
            .getRepository(ctx, Asset)
            .findByIds(input.assets);
        featuredAsset = assetEntities[0]; // First asset as featured
    }
    
    const bundle = new Bundle({
        // ... other fields
        assets: assetEntities,
        featuredAsset: featuredAsset,
    });
    
    // ... save bundle and create shell product
}
```

#### Update Operation

```typescript
async update(ctx: RequestContext, input: UpdateBundleInput): Promise<Bundle> {
    const bundle = await this.findOne(ctx, input.id);
    
    if (input.assets && input.assets.length > 0) {
        const assetEntities = await this.connection
            .getRepository(ctx, Asset)
            .findByIds(input.assets);
        bundle.assets = assetEntities;
        bundle.featuredAsset = assetEntities[0]; // First as featured
    }
    
    // ... update and sync to shell
}
```

### Shell Product Sync

The `syncBundleToShell()` method now syncs assets:

```typescript
private async syncBundleToShell(ctx: RequestContext, bundle: Bundle): Promise<void> {
    const assetIds = bundle.assets?.map(a => a.id) || [];
    const featuredAssetId = bundle.featuredAsset?.id;
    
    await this.productService.update(ctx, {
        id: shellProduct.id,
        assetIds: assetIds,              // All bundle assets
        featuredAssetId: featuredAssetId, // Primary image
        customFields: {
            bundlePrice: effectivePrice,
            bundleAvailability: A_final,
            // ...
        },
        enabled: bundle.status === BundleStatus.ACTIVE
    });
}
```

---

## Admin UI Integration

### Asset Picker Component

The bundle detail editor uses Vendure's standard `vdr-assets` component:

```html
<vdr-card [title]="'Assets' | translate">
    <vdr-assets
        [assets]="assetChanges.assets"
        [featuredAsset]="assetChanges.featuredAsset"
        (change)="onAssetChange($event)"
    ></vdr-assets>
</vdr-card>
```

### Features

1. **Multiple Asset Selection**: Select multiple images for the bundle
2. **Featured Asset**: Click "Set as featured" to mark primary image
3. **Drag & Drop**: Reorder assets by dragging
4. **Asset Preview**: Thumbnail previews in the editor
5. **Remove Assets**: Remove individual assets
6. **Persistence**: Assets save to database on update

### Asset Change Handler

```typescript
onAssetChange(changes: any) {
    this.assetChanges = changes;
    this.bundleForm.markAsDirty(); // Enable Update button
    this.changeDetector.markForCheck();
}
```

### Save Operation

```typescript
const input = {
    id: this.bundle.id,
    // ... other fields
    assets: this.assetChanges.assets?.map((a: any) => a.id) || [],
};

this.dataService.mutate(UPDATE_BUNDLE, { input }).subscribe(/* ... */);
```

---

## Frontend Integration

### GraphQL Fragment

```typescript
export const BUNDLE_FRAGMENT = gql`
  fragment BundleFields on Bundle {
    id
    name
    slug
    description
    effectivePrice
    totalSavings
    status
    assets {
      id
      preview
      source
    }
    featuredAsset {
      id
      preview
      source
    }
    items { /* ... */ }
  }
`;
```

### Bundle List Page (PLP)

```typescript
function toBundleCardData(bundle: Bundle): BundleCard {
    const getImageUrl = (bundle: Bundle) => {
        // 1. Try featured asset
        if (bundle.featuredAsset?.preview) return bundle.featuredAsset.preview;
        
        // 2. Try first asset in array
        if (bundle.assets && bundle.assets.length > 0) return bundle.assets[0].preview;
        
        // 3. Fallback to mock images
        return getMockImage(bundle.name);
    };
    
    return {
        // ...
        image: getImageUrl(bundle),
        price: bundle.effectivePrice || bundle.price,
        savings: bundle.totalSavings,
        inStock: bundle.status === 'ACTIVE',
    };
}
```

### Product Detail Page (PDP)

```typescript
const getBundleImage = (bundle: Bundle) => {
    if (bundle.featuredAsset?.preview) return bundle.featuredAsset.preview;
    if (bundle.assets && bundle.assets.length > 0) return bundle.assets[0].preview;
    return '/product-placeholder.svg';
};

// All bundle assets in image gallery
const images = bundle.assets?.map(a => a.preview) || [getBundleImage(bundle)];
```

### Cart Integration

```typescript
addItem({
    id: bundle.id,
    variantId: `bundle-${bundle.id}`,
    productName: bundle.name,
    price: bundle.effectivePrice || bundle.price,
    image: getBundleImage(bundle),  // Real asset from API
    inStock: bundle.status === 'ACTIVE',
    // ...
});
```

---

## Asset Priority Logic

The system uses a consistent fallback priority across all components:

1. **Featured Asset** (`bundle.featuredAsset.preview`) - Primary image set by admin
2. **First Asset** (`bundle.assets[0].preview`) - First in assets array
3. **Mock Images** - Fallback images based on bundle name
4. **Placeholder** - Generic placeholder if no assets

This ensures bundles always have an image, even during development or if assets aren't uploaded yet.

---

## Benefits

### For Administrators

1. **Professional Asset Management**: Same UX as managing Product assets
2. **Featured Image Control**: Explicitly choose which image represents the bundle
3. **Multiple Images**: Upload multiple product shots, lifestyle images, etc.
4. **Visual Preview**: See exactly how bundles will look on storefront
5. **Drag & Drop**: Easy reordering of assets

### For Developers

1. **Type Safety**: Full TypeScript types for Asset entities
2. **Proper Relations**: Many-to-many with TypeORM
3. **Eager Loading**: Assets loaded automatically with bundle
4. **Cascade Delete**: Assets cleaned up when bundle deleted
5. **Shell Sync**: Assets automatically sync to shell product

### For Customers

1. **High-Quality Images**: Real product images instead of placeholders
2. **Multiple Views**: See bundle from different angles
3. **Consistent UX**: Same image quality as regular products
4. **Fast Loading**: Optimized preview URLs

---

## Migration from Legacy System

### Old Structure (Deprecated)
```typescript
// ❌ Old way
bundle.assets: string[];  // Array of URLs
bundle.image?: string;    // Primary image URL
```

### New Structure (Current)
```typescript
// ✅ New way
bundle.assets: Asset[];       // Array of Asset entities
bundle.featuredAsset?: Asset; // Primary asset entity
```

### Migration Steps

1. **Database Migration**: Run `1731252000000-bundle-asset-relations.ts`
2. **Data Migration**: If you have existing bundles with URL-based assets:
   - Extract URLs from `assets: string[]`
   - Find corresponding Asset entities by preview URL
   - Insert into `bundle_assets` junction table
   - Set `featuredAssetId` from `image` field
3. **Code Updates**: Update all references to use new Asset relations
4. **Test**: Verify asset upload, display, and sync work correctly

---

## Testing Checklist

### Admin UI
- [ ] Upload multiple assets to a bundle
- [ ] Set featured asset using "Set as featured" button
- [ ] Reorder assets by dragging
- [ ] Remove individual assets
- [ ] Save bundle and verify assets persist
- [ ] Reload bundle detail page and verify assets load
- [ ] Check shell product has same assets

### Frontend (Storefront)
- [ ] Bundle list page shows featured asset
- [ ] Bundle PDP shows all assets in gallery
- [ ] Featured asset appears first
- [ ] Cart shows correct bundle image
- [ ] Images load with proper URLs
- [ ] Fallback images work when no assets

### API
- [ ] GraphQL query returns Asset entities
- [ ] Create bundle with assets array
- [ ] Update bundle assets
- [ ] Assets sync to shell product
- [ ] Delete bundle cascades to junction table

---

## Best Practices

### Asset Selection
1. **Always set a featured asset**: This becomes the primary marketing image
2. **Upload at least 2-3 images**: Give customers multiple views
3. **Use high-quality images**: Minimum 800x800px recommended
4. **Consistent styling**: Match regular product image style
5. **Optimize file sizes**: Balance quality vs load time

### Admin Workflow
1. Create bundle with basic info
2. Upload all product images
3. Set featured asset (main marketing shot)
4. Arrange remaining images in desired order
5. Publish bundle (status → ACTIVE)
6. Verify images on storefront

### Development
1. Always fetch `assets` and `featuredAsset` in GraphQL queries
2. Use featured asset as primary image everywhere
3. Implement fallback logic for edge cases
4. Test with and without assets
5. Monitor shell product sync in logs

---

## Troubleshooting

### Assets not persisting
- Check asset IDs are valid and exist in database
- Verify `bundle_assets` table has FK constraints
- Check migration ran successfully
- Look for errors in service logs

### Featured asset not setting
- Ensure first asset in array becomes featured automatically
- Check `featuredAssetId` column is nullable
- Verify Asset entity has proper relations

### Shell product not syncing
- Check `syncBundleToShell()` is called after update
- Verify shell product exists (`bundle.shellProductId`)
- Check ProductService.update permissions
- Look for sync errors in logs

### Images not displaying on frontend
- Verify GraphQL query includes `assets` and `featuredAsset`
- Check preview URLs are absolute and accessible
- Test fallback logic with mock data
- Inspect network requests for 404s

---

## Future Enhancements

### Planned Features
- [ ] Asset tagging (lifestyle, product shot, detail, etc.)
- [ ] Video support for bundle demos
- [ ] AI-generated product descriptions from images
- [ ] Automatic image optimization
- [ ] CDN integration for faster loading
- [ ] A/B testing different featured assets

### Integration Opportunities
- Google Shopping product images
- Social media OG images
- Email marketing templates
- Print materials generation

---

## Support

For questions or issues:
- Check IMPLEMENTATION_PROGRESS.md for latest status
- Review BUNDLE_V2_COMPLETE_ARCHITECTURE.md for architecture
- See migration file for database schema details
- Contact development team for assistance

---

**Status**: ✅ Production Ready  
**Last Updated**: November 10, 2025  
**Version**: Bundle Plugin v2.1
