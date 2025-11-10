# Phase 4.1: Safety & Deletion Logic

**Bundle Plugin v2 - Phase 4.1 Implementation**

## Overview

Phase 4.1 implements critical safety mechanisms to maintain bundle integrity when ProductVariants are modified, archived, or deleted. This prevents data corruption and ensures bundles remain in consistent states.

## Components Implemented

### 1. BundleSafetyService
**Location**: `services/bundle-safety.service.ts`

Event-driven safety service that monitors variant lifecycle events and maintains bundle integrity:

#### Key Features:
- **Event Subscribers**: Automatically responds to `ProductVariantEvent` and `ProductEvent`
- **Variant Updated Handling**: Recomputes affected bundles when components change
- **Variant Deleted Protection**: Marks bundles as BROKEN if critical components are deleted
- **Integrity Validation**: Checks bundle components for availability issues
- **Consistency Checks**: Nightly validation of all active bundles

#### Event Handling:
```typescript
// Variant price/stock updated → recompute bundles
ProductVariantEvent.updated → recomputeBundle()

// Variant archived/disabled → mark bundles BROKEN  
ProductVariantEvent.updated (unavailable) → markBundleBroken()

// Variant deleted → mark bundles BROKEN + alert
ProductVariantEvent.deleted → markBundleBroken() + emit critical alert
```

### 2. BundleLifecycleService  
**Location**: `services/bundle-lifecycle.service.ts`

Manages bundle status transitions and lifecycle operations:

#### Status Transitions:
- **DRAFT → ACTIVE**: `publishBundle()` - Validates and publishes bundle
- **ACTIVE → BROKEN**: `markBundleBroken()` - When components fail
- **ACTIVE → ARCHIVED**: `archiveBundle()` - Manual retirement
- **BROKEN → ACTIVE**: `restoreBundle()` - After fixing issues

#### Key Features:
- **Version Management**: Increments version on publish
- **Validation**: Validates bundle integrity before state changes
- **Audit Trail**: Tracks reasons and timestamps for status changes
- **Bulk Operations**: Support for maintenance operations
- **Statistics**: Lifecycle analytics and reporting

### 3. Database Migration
**Location**: `migrations/1762446001000-bundle-plugin-v2-safety-constraints.ts`

Adds critical database constraints and safety mechanisms:

#### Database Changes:
```sql
-- ON DELETE RESTRICT constraint
ALTER TABLE "bundle_item" 
ADD CONSTRAINT "FK_bundle_item_product_variant_restrict"
FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") 
ON DELETE RESTRICT;

-- Status validation
ALTER TABLE "bundle" 
ADD CONSTRAINT "CHK_bundle_status_valid" 
CHECK ("status" IN ('DRAFT', 'ACTIVE', 'BROKEN', 'ARCHIVED'));

-- Business logic constraints
ALTER TABLE "bundle"
ADD CONSTRAINT "CHK_bundle_fixed_price_required"
CHECK (
  ("discountType" != 'fixed') OR 
  ("discountType" = 'fixed' AND "fixedPrice" IS NOT NULL AND "fixedPrice" > 0)
);
```

#### PostgreSQL Trigger:
```sql
CREATE TRIGGER prevent_variant_deletion_trigger
  BEFORE DELETE ON product_variant
  FOR EACH ROW
  EXECUTE FUNCTION prevent_variant_deletion_if_used_in_bundles();
```

### 4. Bundle Entity Enhancements
**Location**: `entities/bundle.entity.ts`

Added audit fields for safety tracking:

```typescript
@Column('text', { nullable: true })
brokenReason?: string; // Why bundle was marked BROKEN

@Column('timestamp', { nullable: true })
lastRecomputedAt?: Date; // Last recomputation timestamp
```

## Safety Mechanisms

### 1. ON DELETE RESTRICT
**Problem**: Deleting variants used in bundles causes data corruption  
**Solution**: Database constraint prevents deletion with clear error message

```sql
ERROR: Cannot delete variant: it is used in 2 bundle(s): Premium Bundle, Starter Kit. 
Please archive the variant instead or remove it from bundles first.
```

### 2. Event-Driven Recomputation  
**Problem**: Bundle prices become stale when component prices change  
**Solution**: Automatic recomputation triggered by variant events

```typescript
// Component price updated $20 → $25
ProductVariantEvent.updated → BundleSafetyService.handleVariantUpdated()
→ recomputeBundle() → Updated bundle pricing
```

### 3. Automatic BROKEN Status
**Problem**: Bundles with unavailable components should not be purchasable  
**Solution**: Automatic status updates when components fail

```typescript
// Component archived
ProductVariantEvent.updated (archived=true) 
→ markBundleBroken("Component variant 123 is no longer available")
→ Bundle status: ACTIVE → BROKEN
```

### 4. Integrity Validation
**Problem**: Bundle data can become inconsistent over time  
**Solution**: Comprehensive validation with detailed error reporting

```typescript
const result = await bundleSafetyService.validateBundleIntegrity(ctx, bundleId);
// {
//   isValid: false,
//   issues: [
//     { type: 'archived_variant', variantId: '123', message: 'Variant is archived' },
//     { type: 'missing_variant', variantId: '456', message: 'Variant not found' }
//   ]
// }
```

### 5. Consistency Checks
**Problem**: Issues can accumulate without detection  
**Solution**: Nightly consistency scan with automated remediation

```typescript
const stats = await bundleSafetyService.performConsistencyCheck(ctx);
// {
//   totalBundles: 150,
//   brokenBundles: 3,
//   errors: ['Bundle 789: Variant not found']
// }
```

## Integration Points

### 1. Bundle Service Integration
The safety service integrates with existing Bundle Service methods:

```typescript
// Enhanced bundle service with safety integration
async recomputeBundle(ctx: RequestContext, bundleId: ID): Promise<void> {
  // Validate components still available
  // Recompute base price from current component prices  
  // Update lastRecomputedAt timestamp
}
```

### 2. Event Bus Integration
Safety events are published for monitoring and alerting:

```typescript
// Events emitted by safety system
this.eventBus.publish({
  type: 'bundle.status.broken',
  bundleId,
  reason: 'Component variant 123 was deleted',
  timestamp: new Date()
});
```

### 3. Plugin Registration
All safety services are registered in the main bundle plugin:

```typescript
@VendurePlugin({
  providers: [
    BundleService,
    BundleSafetyService,      // ← Phase 4.1
    BundleLifecycleService,  // ← Phase 4.1
    // ...
  ]
})
```

## Usage Examples

### 1. Manual Bundle Lifecycle
```typescript
// Publish a draft bundle
const bundle = await lifecycleService.publishBundle(ctx, bundleId);
// → Status: DRAFT → ACTIVE, Version: 1 → 2

// Archive an active bundle  
await lifecycleService.archiveBundle(ctx, bundleId, 'End of season');
// → Status: ACTIVE → ARCHIVED

// Restore a broken bundle (after fixing issues)
await lifecycleService.restoreBundle(ctx, bundleId);
// → Status: BROKEN → ACTIVE
```

### 2. Safety Validation
```typescript
// Check if variant can be safely deleted
const check = await safetyService.canDeleteVariant(ctx, variantId);
if (!check.canDelete) {
  throw new Error(`Cannot delete: used in ${check.blockingBundles.length} bundles`);
}

// Validate bundle integrity
const integrity = await safetyService.validateBundleIntegrity(ctx, bundleId);
if (!integrity.isValid) {
  // Handle integrity issues
}
```

### 3. Consistency Monitoring
```typescript
// Nightly consistency check (run via cron job)
const stats = await safetyService.performConsistencyCheck(ctx);

// Alert if broken bundles found
if (stats.brokenBundles > 0) {
  await alertingService.notify(`${stats.brokenBundles} bundles marked as broken`);
}
```

## Error Handling

### 1. Database Constraint Violations
```typescript
try {
  await productVariantService.delete(ctx, variantId);
} catch (error) {
  if (error.code === 'foreign_key_violation') {
    // Handle gracefully - suggest archiving instead
    throw new UserInputError(
      'Cannot delete variant used in bundles. Please archive it instead.'
    );
  }
}
```

### 2. Recomputation Failures
```typescript
// If recomputation fails, mark bundle as broken
try {
  await this.recomputeBundle(ctx, bundleId);
} catch (error) {
  await this.markBundleBroken(ctx, bundleId, `Recomputation failed: ${error.message}`);
}
```

### 3. Integrity Issues
```typescript
// Graceful handling of integrity problems
const integrity = await validateBundleIntegrity(ctx, bundleId);
if (!integrity.isValid) {
  // Log issues for investigation
  Logger.warn(`Bundle ${bundleId} integrity issues:`, integrity.issues);
  
  // Mark as broken if bundle is currently active
  if (bundle.status === 'ACTIVE') {
    await markBundleBroken(ctx, bundleId, integrity.issues.map(i => i.message).join(', '));
  }
}
```

## Performance Considerations

### 1. Database Indexes
Migration adds performance indexes for safety queries:
- `IDX_bundle_item_product_variant_safety` - Finding bundles by variant
- `IDX_bundle_status_active` - Active bundle queries  
- `IDX_bundle_item_bundle_id` - Bundle item lookups

### 2. Event Processing
Safety events are processed asynchronously to avoid blocking:
- Recomputation triggered asynchronously
- Batch processing for consistency checks
- Graceful failure handling

### 3. Caching Considerations
Safety operations may invalidate caches:
- Bundle pricing caches cleared after recomputation
- Availability caches updated when bundles marked broken
- Search indexes refreshed when status changes

## Monitoring & Alerting

### 1. Key Metrics
- Bundle recomputation frequency
- Broken bundle count
- Consistency check results
- Safety event volumes

### 2. Critical Alerts
- Variant deletion attempts blocked
- Multiple bundles broken simultaneously  
- Consistency check failures
- Recomputation errors

### 3. Performance Monitoring
- Safety event processing latency
- Consistency check duration
- Database constraint violation frequency

## Phase 4.1 Completion

Phase 4.1 successfully implements all safety and deletion logic requirements from the Bundle Plugin v2 specification:

✅ **Database Constraints**: ON DELETE RESTRICT prevents data corruption  
✅ **Event Subscribers**: Automatic bundle maintenance on component changes  
✅ **Bundle Lifecycle**: Complete status management (DRAFT→ACTIVE→BROKEN→ARCHIVED)  
✅ **Integrity Validation**: Comprehensive bundle health checks  
✅ **Consistency Monitoring**: Nightly validation and automated remediation  
✅ **Audit Trail**: Complete tracking of safety events and status changes  

The system now provides robust protection against data corruption while maintaining bundle integrity through component lifecycle changes.