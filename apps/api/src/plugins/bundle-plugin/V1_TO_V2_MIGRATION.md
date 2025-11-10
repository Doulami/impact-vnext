# Bundle Plugin v1 → v2 Schema Migration

## Quick Reference: What Changed

### Bundle Entity Fields

| v1 Field | v2 Replacement | Notes |
|----------|----------------|-------|
| `price: number` | `discountType: 'fixed' \| 'percent'` | Now determines discount mode |
| | `fixedPrice?: number` | Used when discountType='fixed' (in cents) |
| | `percentOff?: number` | Used when discountType='percent' (0-100) |
| `enabled: boolean` | `status: 'DRAFT' \| 'ACTIVE' \| 'BROKEN' \| 'ARCHIVED'` | Rich lifecycle states |
| | `version: number` | Auto-incremented on publish |

### BundleItem Entity Fields

| v1 Field | v2 Addition | Notes |
|----------|-------------|-------|
| `quantity: number` | ✅ Same | No change |
| `unitPrice: number` | ✅ Same | No change |
| `displayOrder: number` | ✅ Same | No change |
| ❌ None | `weight?: number` | **NEW**: Optional, for fixed-price proration |

---

## Admin UI Changes

### Form Fields
```diff
- Price: [input type=number]           # Single price field
- Enabled: [checkbox]                  # Boolean on/off

+ Discount Type: [select]              # fixed | percent
+ Fixed Price: [input]                 # Shown when type=fixed
+ Percentage Off: [input]              # Shown when type=percent
+ Status: [chip display]               # DRAFT/ACTIVE/BROKEN/ARCHIVED
+ Version: [badge]                     # v1, v2, v3...
```

### Action Buttons
```diff
- Save
- Delete

+ Save                                 # Updates without changing status
+ Publish                              # DRAFT → ACTIVE (increments version)
+ Archive                              # ACTIVE → ARCHIVED
+ Delete
```

---

## GraphQL Schema Changes

### Bundle Type
```graphql
# v1
type Bundle {
  id: ID!
  name: String!
  price: Float!              # ❌ REMOVED
  enabled: Boolean!          # ❌ REMOVED
  items: [BundleItem!]!
}

# v2
type Bundle {
  id: ID!
  name: String!
  discountType: String!      # ✅ NEW
  fixedPrice: Int            # ✅ NEW (cents)
  percentOff: Float          # ✅ NEW (0-100)
  status: String!            # ✅ NEW
  version: Int!              # ✅ NEW
  items: [BundleItem!]!
}
```

### BundleItem Type
```graphql
# v1
type BundleItem {
  id: ID!
  productVariant: ProductVariant!
  quantity: Int!
  unitPrice: Float!
  displayOrder: Int!
}

# v2
type BundleItem {
  id: ID!
  productVariant: ProductVariant!
  quantity: Int!
  unitPrice: Float!
  weight: Float              # ✅ NEW (optional)
  displayOrder: Int!
}
```

### Mutations
```graphql
# v1 (OLD)
input CreateBundleInput {
  name: String!
  price: Float!              # ❌ REMOVED
  enabled: Boolean!          # ❌ REMOVED
  items: [BundleItemInput!]!
}

# v2 (NEW)
input CreateBundleInput {
  name: String!
  discountType: String!      # ✅ NEW: "fixed" | "percent"
  fixedPrice: Int            # ✅ NEW: required if discountType=fixed
  percentOff: Float          # ✅ NEW: required if discountType=percent
  items: [BundleItemInput!]!
}

# New mutations
mutation PublishBundle($id: ID!)   # ✅ NEW: DRAFT → ACTIVE
mutation ArchiveBundle($id: ID!, $reason: String)  # ✅ NEW: ACTIVE → ARCHIVED
```

---

## Data Migration

If you have existing bundles in the database:

### SQL Migration Template
```sql
-- Add new columns
ALTER TABLE bundle 
  ADD COLUMN discount_type VARCHAR(10) DEFAULT 'fixed',
  ADD COLUMN fixed_price INT,
  ADD COLUMN percent_off FLOAT,
  ADD COLUMN status VARCHAR(20) DEFAULT 'DRAFT',
  ADD COLUMN version INT DEFAULT 1;

-- Migrate existing data: assume old 'price' was a fixed bundle price
UPDATE bundle 
SET 
  discount_type = 'fixed',
  fixed_price = price * 100,  -- Convert to cents
  status = CASE WHEN enabled = true THEN 'ACTIVE' ELSE 'DRAFT' END,
  version = 1;

-- Add weight column to bundle_item
ALTER TABLE bundle_item 
  ADD COLUMN weight FLOAT;

-- Drop old columns (after verifying migration)
ALTER TABLE bundle 
  DROP COLUMN price,
  DROP COLUMN enabled;
```

---

## Backend Implementation Checklist

Based on `verify_Bundle_Plugin_v2.md`:

### ✅ Must Have (for Admin UI to work)
- [x] Entity fields: discountType, fixedPrice, percentOff, status, version
- [x] Entity fields: weight on BundleItem
- [x] GraphQL queries: bundle, bundles with v2 fields
- [x] GraphQL mutations: publishBundle, archiveBundle
- [x] Update CREATE/UPDATE mutations to accept v2 fields

### 🔄 Should Have (for production)
- [ ] Availability calculation using component constraints
- [ ] Pricing logic: percent vs fixed with proration
- [ ] OrderLine customFields for bundle metadata
- [ ] Promotion system integration (ApplyBundleLineAdjustments)

### ⚠️ Nice to Have (for robustness)
- [ ] ON DELETE RESTRICT constraint on ProductVariant
- [ ] Event subscribers for variant changes → recompute
- [ ] Automatic BROKEN status detection
- [ ] Metrics and monitoring

---

## Testing the Migration

1. **Start fresh bundle**:
   ```bash
   cd apps/api
   npm run dev
   ```

2. **Test fixed-price bundle**:
   - Create bundle with discountType="fixed", fixedPrice=2999
   - Add 2-3 components
   - Save as DRAFT
   - Publish → verify status=ACTIVE, version=1

3. **Test percent-off bundle**:
   - Create bundle with discountType="percent", percentOff=20
   - Add components
   - Verify savings calculation

4. **Test lifecycle**:
   - Publish: DRAFT → ACTIVE (version increments)
   - Archive: ACTIVE → ARCHIVED
   - Verify buttons show/hide correctly

---

## Rollback Plan

If issues arise:

1. **Database**: Keep old `price` and `enabled` columns temporarily
2. **Code**: Tag current state before deploying
3. **Admin UI**: Can coexist with v1 backend if needed (will error gracefully)

---

## References

- **Full Spec**: `apps/api/src/plugins/verify_Bundle_Plugin_v2.md`
- **Status**: `BUNDLE_PLUGIN_V2_STATUS.md`
- **UI Summary**: `ADMIN_UI_V2_UPDATE_SUMMARY.md`
