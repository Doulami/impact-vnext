# Bundle Plugin Cleanup Notes

**Date**: November 24, 2025  
**Phase**: After Bundle UI Refactor Implementation

## Purpose
This document tracks fields, files, and code that can be removed/deprecated after the variant-based bundle workflow migration is complete and stable.

---

## Database Fields to Deprecate

### Bundle Entity (`apps/api/src/plugins/bundle-plugin/entities/bundle.entity.ts`)

**Fields to mark as deprecated:**

```typescript
// Line ~71-77: ManyToMany assets relation
@ManyToMany(() => Asset, { eager: true })
@JoinTable(...)
assets: Asset[];  // DEPRECATED: Shell product manages assets

// Line ~79-80: Featured asset
@ManyToOne(() => Asset, { nullable: true, eager: true })
featuredAsset?: Asset;  // DEPRECATED: Shell product manages assets

// Line ~82-83: Tags
@Column('simple-json', { nullable: true })
tags?: string[];  // DEPRECATED: Not synced, not used in new UI

// Line ~85-86: Category
@Column({ nullable: true })
category?: string;  // DEPRECATED: Not synced, not used in new UI

// Line ~43-44: Slug
@Column({ unique: true, nullable: true })
slug?: string;  // DEPRECATED: Not needed for variant-based bundles
```

**Reason**: Asset sync removed. Shell product manages its own assets. Category/tags/slug not synced and not used in new variant tab UI.

**Migration Strategy**:
1. Add `@deprecated` JSDoc comments to these fields
2. After 6 months, add database migration to make these nullable (if not already)
3. After 12 months, can be dropped from schema entirely

---

## Input Interface Fields to Remove

### CreateBundleInput (`apps/api/src/plugins/bundle-plugin/services/bundle.service.ts`)

**Fields to remove (lines ~33-36):**

```typescript
assets?: string[];     // DEPRECATED: Not used
tags?: string[];       // DEPRECATED: Not used
category?: string;     // DEPRECATED: Not used
slug?: string;         // DEPRECATED: Not used
```

### UpdateBundleInput (lines ~62-64)

```typescript
assets?: string[];     // DEPRECATED: Not used
tags?: string[];       // DEPRECATED: Not used
category?: string;     // DEPRECATED: Not used
slug?: string;         // DEPRECATED: Not used
```

**Reason**: New UI doesn't expose these fields. Old standalone UI still uses them, but can be removed after migration.

**Migration Strategy**:
1. Mark with `@deprecated` JSDoc comments
2. After old UI removal, delete these fields from interfaces

---

## GraphQL Schema Fields to Deprecate

### Bundle Type (`apps/api/src/plugins/bundle-plugin/bundle.plugin.ts`)

**In Shop API schema (lines ~88-91):**

```graphql
assets: [Asset!]!       # DEPRECATED: Use shell product assets
featuredAsset: Asset    # DEPRECATED: Use shell product featuredAsset
tags: [String!]         # DEPRECATED: Not used
category: String        # DEPRECATED: Not used
```

**Reason**: Storefront should use shell product's assets, not bundle assets.

**Migration Strategy**:
1. Add `@deprecated` directive to GraphQL schema fields
2. Document in changelog that clients should use Product.assets instead
3. After 6 months of deprecation warnings, can be removed (breaking change)

---

## UI Files to Remove

### Old Standalone Bundle UI

**Files marked for removal (after migration period):**

```
apps/api/src/plugins/bundle-plugin/ui/
├── bundle-nav.module.ts                 # CLEANUP: Old nav item
├── bundle-ui.module.ts                  # CLEANUP: Old lazy module
├── bundle-list.component.ts             # CLEANUP: Old list view
├── bundle-detail.component.ts           # CLEANUP: Old detail form
└── components/
    └── bundle-list/
        └── bundle-list.component.ts     # CLEANUP: Old list component
```

**Also in bundle-ui-extension.ts (lines 22-33):**

```typescript
ngModules: [  // CLEANUP: Remove after migration
  {
    type: 'shared',
    ngModuleFileName: 'bundle-nav.module.ts',
    ngModuleName: 'BundleNavModule',
  },
  {
    type: 'lazy',
    route: 'bundles',
    ngModuleFileName: 'bundle-ui.module.ts',
    ngModuleName: 'BundleUiModule',
  },
],
```

**Reason**: Replaced by new variant tab UI. Old UI kept for backwards compatibility during transition.

**Migration Strategy**:
1. Monitor usage of `/extensions/bundles` route (if possible)
2. After 3-6 months, add deprecation notice in old UI
3. After 6-12 months, remove ngModules from bundle-ui-extension.ts
4. Delete old UI files

---

## Code Marked for Cleanup

### In bundle.service.ts

**Line ~878-882**: Asset sync removal comment

```typescript
// NOTE: Asset sync removed - shell product manages its own assets
// Storefront uses shell product assets, not bundle assets
// CLEANUP: Bundle.assets and Bundle.featuredAsset fields can be deprecated in future
```

**Action**: When database fields are deprecated, update this comment or remove it.

---

### In bundle.service.ts - Create Method

**Lines ~142-149**: Asset fetching logic

```typescript
// Fetch asset entities if provided
let assetEntities: Asset[] = [];
let featuredAsset: Asset | undefined;

if (input.assets && input.assets.length > 0) {
    assetEntities = await this.connection.getRepository(ctx, Asset).findByIds(input.assets);
    featuredAsset = assetEntities[0]; // First asset as featured
}
```

**Reason**: Not needed if assets input is deprecated.

**Migration Strategy**: Remove when CreateBundleInput.assets is removed.

---

### In bundle.service.ts - Create Method

**Lines ~174-177**: Asset assignment in bundle creation

```typescript
assets: assetEntities,
featuredAsset: featuredAsset,
tags: input.tags,
category: input.category,
```

**Reason**: Assets/tags/category not used in new workflow.

**Migration Strategy**: Remove when input fields are deprecated.

---

## Config Type Cleanup

### BundlePluginConfig

**File**: `apps/api/src/plugins/bundle-plugin/types/bundle-config.types.ts`

**No cleanup needed**: We removed `disableAssetSync` field since we removed asset sync entirely.

---

## Migration Checklist

### Phase 1: Immediate (Done)
- [x] Remove asset sync from syncBundleToShell()
- [x] Add cleanup comments in code
- [x] Keep old UI for backwards compatibility
- [x] Create new variant tab UI

### Phase 2: After Deployment (1-3 months)
- [ ] Monitor usage of old `/extensions/bundles` route
- [ ] Add deprecation warnings to old UI
- [ ] Add `@deprecated` JSDoc to Bundle entity fields
- [ ] Add `@deprecated` to input interface fields

### Phase 3: Migration Period (3-6 months)
- [ ] Encourage users to migrate to new variant tab workflow
- [ ] Add `@deprecated` directive to GraphQL schema fields
- [ ] Document migration path in changelog

### Phase 4: Cleanup (6-12 months)
- [ ] Remove ngModules from bundle-ui-extension.ts
- [ ] Delete old UI files (bundle-nav.module.ts, bundle-ui.module.ts, etc.)
- [ ] Remove deprecated input fields
- [ ] Create database migration to drop deprecated columns
- [ ] Remove deprecated GraphQL schema fields (breaking change - major version)

---

## Testing Before Cleanup

Before removing any deprecated fields/files, verify:

1. **Old Bundles**: Existing bundles with assets still work (even if assets ignored)
2. **Shop API**: Storefront queries don't break (even if fields return null)
3. **Admin API**: Old mutations still work (even if fields ignored)
4. **No Usage**: Confirm no active use of deprecated fields via logs/analytics

---

## Questions for Future

1. **Database**: Should we keep deprecated columns NULL or drop entirely?
2. **GraphQL**: Major version bump for schema changes or keep deprecated fields indefinitely?
3. **Old UI**: Remove after 6 months or 12 months?

---

**Last Updated**: November 24, 2025  
**Next Review**: May 2026 (after 6 months)
