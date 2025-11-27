# Bundle Refactor - Continuation Guide

## ✅ Completed (Commit 17deb2c0)
- Removed `name`, `slug`, `description` columns from Bundle entity
- Removed legacy fields: `tags`, `category`, `assets`, `featuredAsset`, `price`, `enabled`
- Added `shellProduct` @ManyToOne relation  
- Made `shellProductId` required
- Updated `validate()` method
- Cleaned up bundle.service.ts `create()` method

## 🔄 Next Steps (Continue Fresh)

### 1. Remove createShellProduct() method
**File**: `apps/api/src/plugins/bundle-plugin/services/bundle.service.ts`
- Delete `createShellProduct()` method (lines ~287-330)
- It's no longer needed since shellProduct must exist before bundle creation

### 2. Replace ALL `bundle.name` with `shellProduct.name`
**Search for**: `bundle.name` in entire bundle-plugin directory

**Files to update**:
- `services/bundle.service.ts`: ~50+ occurrences in logging, errors, order metadata
- `services/bundle-lifecycle.service.ts`: Lines 70, 110, 148, 186, 292
- `services/bundle-reservation.service.ts`: Line 68
- `services/bundle-safety.service.ts`: Line 426
- `jobs/auto-expire-bundles.job.ts`: Lines 106, 112, 120
- `tasks/auto-expire-bundles.task.ts`: Line 73

**Replace pattern**:
```typescript
// Before
bundle.name

// After  
bundle.shellProduct?.name || 'Unnamed Bundle'
```

### 3. Add shellProduct to all query relations
**File**: `services/bundle.service.ts`
- In `findOne()`: Add `'shellProduct'` to relations array
- In `findAll()`: Add `'shellProduct'` to relations array
- Verify all queries load shellProduct

### 4. Remove ALL Logger.info() calls
Keep only `Logger.error()` and `Logger.warn()`
Remove verbose info logging throughout bundle-plugin

### 5. Update GraphQL Schema
**File**: `bundle.plugin.ts`

Remove from Bundle type:
```graphql
name: String!
slug: String
description: String
```

Add to Bundle type:
```graphql
shellProduct: Product!
```

### 6. Update Shop API Queries
Ensure all bundle queries include:
```graphql
shellProduct {
  id
  name
  slug
  description
}
```

### 7. Update Dashboard
**File**: `dashboard/bundle.index.tsx`
- Display `shellProduct.name` everywhere
- Remove bundle name edit fields
- Show shell product name as read-only

### 8. Create Database Migration
```sql
ALTER TABLE bundle DROP COLUMN name;
ALTER TABLE bundle DROP COLUMN slug;
ALTER TABLE bundle DROP COLUMN description;
ALTER TABLE bundle DROP COLUMN tags;
ALTER TABLE bundle DROP COLUMN category;
ALTER TABLE bundle DROP COLUMN price;
ALTER TABLE bundle DROP COLUMN enabled;
-- Drop bundle_assets join table if exists
```

## Search Commands for Next Session

```bash
# Find all bundle.name usages
grep -r "bundle\.name" apps/api/src/plugins/bundle-plugin/

# Find all Logger.info calls
grep -r "Logger\.info" apps/api/src/plugins/bundle-plugin/

# Find bundle.slug usages
grep -r "bundle\.slug" apps/api/src/plugins/bundle-plugin/

# Find bundle.description usages
grep -r "bundle\.description" apps/api/src/plugins/bundle-plugin/
```

## Testing Checklist

After completing all steps:
- [ ] Bundle creation from product tab works
- [ ] Bundle displays correct name from shell product
- [ ] Bundle update works
- [ ] Publish bundle (DRAFT → ACTIVE) works
- [ ] Orders show correct bundle name
- [ ] Dashboard displays bundle names correctly
- [ ] All error messages show bundle names
- [ ] No Logger.info spam in logs
