# Bundle Plugin v2 - Complete Architecture
## Production-Ready Design with Shell Products & Availability

**Date**: November 10, 2025  
**Status**: Architecture Finalized, Ready for Implementation

---

## Architecture Overview

### Dual-Entity System

```
┌─────────────────────────────────────────────────────────────┐
│                    BUNDLE SYSTEM                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐           ┌──────────────────┐        │
│  │  Bundle Entity  │◄─────────►│  Shell Product   │        │
│  │  (Source Truth) │  1-to-1   │  (SEO/Discovery) │        │
│  └─────────────────┘           └──────────────────┘        │
│         │                              │                     │
│         │ has many                     │ appears in          │
│         ▼                              ▼                     │
│  ┌─────────────────┐           ┌──────────────────┐        │
│  │  BundleItems    │           │  Search Index    │        │
│  │  (Components)   │           │  PLP/Categories  │        │
│  └─────────────────┘           └──────────────────┘        │
│         │                                                    │
│         │ references                                         │
│         ▼                                                    │
│  ┌─────────────────┐                                        │
│  │ ProductVariants │                                        │
│  │  (Real Stock)   │                                        │
│  └─────────────────┘                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Responsibilities

| Aspect | Bundle Entity | Shell Product |
|--------|--------------|---------------|
| **Purpose** | Logic & calculations | SEO & discovery |
| **Pricing** | Source of truth | Synced display |
| **Availability** | Computes A_final | Displays A_final |
| **Images** | Stores image | Displays image |
| **Components** | Manages list | N/A |
| **Stock** | Never tracked | trackInventory=false |
| **Cart/Orders** | Drives exploded lines | Never used in orders |
| **Search** | Not indexed | Indexed normally |
| **SEO/Facets** | N/A | Manages meta, facets |
| **Editing** | Price, name, discount | SEO, facets, collections |

---

## Data Model

### Bundle Entity (Enhanced)

```typescript
class Bundle extends VendureEntity {
  id: ID;
  name: string;
  slug: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'BROKEN' | 'ARCHIVED';
  
  // Discount
  discountType: 'fixed' | 'percent';
  fixedPrice?: int; // cents
  percentOff?: number; // 0-100
  
  // NEW: Scheduling & Gating
  validFrom?: Date;
  validTo?: Date;
  bundleCap?: int; // Optional marketing gate (A_shell)
  
  // NEW: Visual
  image?: string; // Asset URL, syncs to shell
  assets: Asset[];
  tags: string[];
  category: string;
  
  // Shell link
  shellProductId?: ID; // Auto-created shell
  
  // Versioning
  version: int; // Increments on publish
  
  // Promo policy
  allowExternalPromos: boolean;
  
  // Relations
  items: BundleItem[]; // OneToMany, eager
  
  // Audit
  brokenReason?: string;
  lastRecomputedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Shell Product CustomFields

```typescript
Product.customFields = {
  isBundle: boolean; // Always true for shells
  bundleId: ID; // Link back to Bundle
  bundlePrice: int; // Synced computed price (cents)
  bundleAvailability: int; // A_final, updated on recompute
  bundleComponents: string; // JSON: [{variantId, qty}]
}
```

### Shell Product Configuration
- **Single Variant**: `trackInventory = false` (NEVER tracks stock)
- **Price**: Synced from Bundle.computedPrice (display only)
- **Stock Display**: Uses `bundleAvailability` from customFields
- **Facets**: Auto-assigned "Bundle" facet
- **Collections**: Admin-managed for merchandising
- **SEO**: Admin-managed (title, meta, slug)

---

## Availability Calculation (A_final)

### The Right Order (Hard Stops First)

```typescript
function calculateBundleAvailability(
  ctx: RequestContext, 
  bundle: Bundle
): number {
  
  // 1. SCHEDULE GATE (hard stop)
  if (bundle.status !== 'ACTIVE') return 0;
  
  const now = new Date();
  if (bundle.validFrom && now < bundle.validFrom) return 0;
  if (bundle.validTo && now > bundle.validTo) return 0;
  
  // 2. CHANNEL & VISIBILITY
  if (!bundle.enabledForChannel(ctx.channel)) return 0;
  
  // 3. BUNDLE CAP (marketing gate)
  const A_shell = bundle.bundleCap ?? Infinity;
  
  // 4. COMPONENT AVAILABILITY (real stock)
  let A_components = Infinity;
  
  for (const item of bundle.items) {
    const variant = item.productVariant;
    const q_i = item.quantity;
    
    // Get effective available stock for this channel
    let avail_i: number;
    
    if (variant.useBackorders) {
      avail_i = variant.stockOnHand 
                - variant.stockReserved 
                + (variant.backorderAllowance ?? 0);
    } else {
      avail_i = variant.stockOnHand - variant.stockReserved;
    }
    
    // How many bundles can this component support?
    const bundles_i = Math.floor(avail_i / q_i);
    
    A_components = Math.min(A_components, bundles_i);
  }
  
  // 5. FINAL SELLABLE QUANTITY
  const A_final = Math.min(A_shell, A_components);
  
  return Math.max(0, A_final);
}
```

### Where Each Check Runs

| Phase | When | What |
|-------|------|------|
| **Index Time** | Background job after publish/update | Recompute A_final → sync to shell.customFields.bundleAvailability |
| **Cart Add** | `addBundleToOrder` mutation | Fresh A_final check, cap requested quantity |
| **Cart Adjust** | `adjustBundleInOrder` mutation | Fresh A_final revalidation |
| **Pre-Payment** | Before order finalization | Final race condition check |
| **Admin UI** | Bundle editor load | Show Component Health panel with A_final |

### Error Messages (User-Facing)

| Condition | Message |
|-----------|---------|
| `validFrom > now` | "Available starting [DATE]" |
| `validTo < now` | "This bundle ended on [DATE]" |
| `status !== ACTIVE` | "This bundle is currently unavailable" |
| `A_final = 0` | "Out of stock" |
| `requested > A_final` | "Only [A_final] available. Quantity adjusted." |

---

## Shell Product Auto-Creation

### On Bundle.create()

```typescript
async create(ctx: RequestContext, input: CreateBundleInput): Promise<Bundle> {
  // 1. Create Bundle entity
  const bundle = await this.bundleRepository.save({
    ...input,
    status: 'DRAFT',
    version: 1
  });
  
  // 2. Ensure "Bundle" facet exists
  await this.ensureBundleFacet(ctx);
  
  // 3. Auto-create Shell Product
  const shellProductId = await this.createShellProduct(ctx, bundle);
  
  // 4. Link shell to bundle
  bundle.shellProductId = shellProductId;
  await this.bundleRepository.save(bundle);
  
  return bundle;
}

private async createShellProduct(
  ctx: RequestContext, 
  bundle: Bundle
): Promise<ID> {
  // Create product
  const product = await this.productService.create(ctx, {
    translations: [{
      languageCode: LanguageCode.en,
      name: bundle.name,
      slug: bundle.slug || `bundle-${bundle.id}`,
      description: bundle.description
    }],
    customFields: {
      isBundle: true,
      bundleId: bundle.id,
      bundlePrice: 0, // Will sync on publish
      bundleAvailability: 0,
      bundleComponents: JSON.stringify(
        bundle.items.map(i => ({ 
          variantId: i.productVariant.id, 
          qty: i.quantity 
        }))
      )
    },
    facetValueIds: [await this.getBundleFacetValueId(ctx)]
  });
  
  // Sync image if provided
  if (bundle.image) {
    await this.productService.addFeaturedAsset(ctx, product.id, bundle.image);
  }
  
  // Create single variant (trackInventory = false)
  const variant = await this.productVariantService.create(ctx, [{
    productId: product.id,
    sku: `BUNDLE-${bundle.id}`,
    price: 0, // Will sync on publish
    trackInventory: false,
    translations: [{
      languageCode: LanguageCode.en,
      name: bundle.name
    }]
  }]);
  
  return product.id;
}
```

### One-Way Sync: Bundle → Shell

**Triggers**: Bundle publish, update, recompute

**Synced Fields**:
- Name (Bundle.name → Product.name, Variant.name)
- Description (Bundle.description → Product.description)
- Image (Bundle.image → Product.featuredAsset)
- Price (computed → Variant.price, customFields.bundlePrice)
- Availability (A_final → customFields.bundleAvailability)
- Components (items → customFields.bundleComponents JSON)

**Locked on Shell** (admin warning shown):
- Price (managed by Bundle discount)
- Name (managed by Bundle)

**Shell-Only** (not synced):
- SEO meta (title, description override)
- Facets (except auto "Bundle" facet)
- Collections
- Tags
- Additional assets

---

## Admin UI Enhancements

### Bundle Editor Layout

```
┌────────────────────────────────────────────────────────────┐
│ Bundle Editor: "Protein Power Pack"                  [Save]│
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Basic Info                                                  │
│  Name: [Protein Power Pack                            ]    │
│  Slug: [protein-power-pack                            ]    │
│  Description: [Multi-line text...                     ]    │
│                                                             │
│ Visual                                                      │
│  Image: [Upload]  [Preview: protein-pack.jpg]             │
│                                                             │
│ Scheduling & Gating                                         │
│  Valid From: [2025-01-01] Valid To: [2025-12-31]          │
│  Bundle Cap: [100] (optional marketing limit)              │
│                                                             │
│ Discount                                                    │
│  Type: (•) Fixed Price  ( ) Percent Off                    │
│  Fixed Price: [$29.99]                                     │
│                                                             │
│ Components                                                  │
│  ┌────────────────────────────────────────────────────┐   │
│  │ Whey Protein 2kg      Qty: [2]  Stock: 50  ✓      │   │
│  │ Creatine 500g         Qty: [1]  Stock: 20  ✓      │   │
│  │ BCAA Powder 300g      Qty: [1]  Stock: 0   ✗      │   │
│  └────────────────────────────────────────────────────┘   │
│  [+ Add Component]                                          │
│                                                             │
├────────────────────────────────────────────────────────────┤
│ Shell Product Summary (Read-Only)                          │
│  SEO Title: "Buy Protein Power Pack - Best Value"         │
│  Collections: Mass Gainers, Bundles                        │
│  Facets: Bundle, Protein                                   │
│                                                             │
│  ⚠️  Price and Name are managed by this Bundle            │
│  [Edit Shell Product Details] ────────────────────►       │
├────────────────────────────────────────────────────────────┤
│ Component Health                                            │
│  ⚠️  BCAA Powder 300g is out of stock                     │
│  Computed Availability: 0 bundles available                │
│  Computed Price: $29.99 (Save $10.00 / 25%)               │
├────────────────────────────────────────────────────────────┤
│ Status: DRAFT                                [Publish]      │
└────────────────────────────────────────────────────────────┘
```

### Shell Product Edit (Warning Banner)

```
┌────────────────────────────────────────────────────────────┐
│ Product: "Protein Power Pack" (Bundle Shell)               │
├────────────────────────────────────────────────────────────┤
│ ⚠️  WARNING: This is a Bundle Shell Product                │
│    • Price is managed by the Bundle discount               │
│    • Name is synced from Bundle                            │
│    • Edit SEO, Collections, Facets here                    │
│    [Go to Bundle Editor] ──────────────────►               │
├────────────────────────────────────────────────────────────┤
│ SEO & Marketing (Editable)                                 │
│  SEO Title: [Buy Protein Power Pack - Best Value     ]    │
│  Meta Description: [...]                                   │
│  Collections: [Mass Gainers] [Bundles]                    │
│  Facets: [Bundle] [Protein] [Mass Gainer]                 │
│                                                             │
│ Price & Stock (Read-Only)                                  │
│  Price: $29.99 (synced from Bundle)                       │
│  Stock: Not tracked (Bundle components drive availability) │
└────────────────────────────────────────────────────────────┘
```

---

## Frontend Flow

### Discovery (PLP/Search)
```typescript
// Query products normally - shells included
const { data } = useQuery(SEARCH_PRODUCTS, {
  variables: {
    input: {
      term: searchTerm,
      groupByProduct: true,
      facetValueFilters: [{ or: ['bundle-facet-id'] }] // Optional filter
    }
  }
});

// Shell products appear with bundlePrice and bundleAvailability
products.forEach(product => {
  if (product.customFields?.isBundle) {
    // Show as bundle in PLP
    displayBundleCard(product);
  }
});
```

### PDP (Product Detail)
```typescript
// Detect bundle and fetch full Bundle entity
if (product.customFields?.isBundle) {
  const { data } = useQuery(GET_BUNDLE, {
    variables: { id: product.customFields.bundleId }
  });
  
  const bundle = data.bundle;
  const A_final = product.customFields.bundleAvailability;
  
  // Show components with computed savings
  displayBundleComponents(bundle.items);
  displaySavings(bundle.price, componentTotal);
  
  // Quantity stepper capped at A_final
  <QuantityStepper max={A_final} />
}
```

### Add to Cart
```typescript
// Use bundleId, not shell productId
const addToCart = async () => {
  const result = await addBundleToOrder({
    variables: {
      bundleId: product.customFields.bundleId,
      quantity: selectedQuantity
    }
  });
  
  if (result.errors) {
    // Show availability error
    showError(result.errors[0].message);
  }
};
```

---

## Implementation Priority

### ✅ MVP (Week 1-2)
1. Add Bundle fields: image, validFrom, validTo, bundleCap
2. Implement createShellProduct() with auto-creation
3. Implement checkBundleAvailability() with all gates
4. Update addBundleToOrder to validate A_final
5. Basic shell sync on publish

### 🔄 Production Hardening (Week 3)
6. Admin UI: Image upload, scheduling fields
7. Admin UI: Component Health panel
8. Admin UI: Shell Product Summary panel with warning
9. Recompute job with shell sync
10. Event subscribers for variant changes

### 🚀 Polish (Week 4)
11. Frontend: Bundle facet filter
12. Frontend: PDP bundle detection
13. Search index optimization
14. Nightly consistency job
15. Complete edge case testing

---

## How We Look 👍

**Architecture**: ✅ Production-ready dual-entity system  
**Availability**: ✅ Comprehensive gating with schedule + cap + components  
**SEO**: ✅ Shell products fully indexed and discoverable  
**Admin UX**: ✅ Clear separation with warnings and deep-links  
**Cart Logic**: ✅ Exploded bundles with proper validation  
**Sync**: ✅ One-way Bundle→Shell with locked fields  

**Status**: Ready to implement Phase 1!
