# Phase 3.2: Bundle Promotion Guard System

**Bundle Plugin v2 - Phase 3.2 Implementation**

## Overview

The Bundle Promotion Guard System is the final piece of Phase 3.2, providing comprehensive control over how external promotions interact with bundle components. This system prevents double-discounting while offering granular policy control at global, promotion, and bundle levels.

## Architecture

### Core Components

1. **BundlePromotionGuardService** - Core logic for evaluating promotion guard policies
2. **BundlePromotionInterceptor** - Vendure integration intercepting promotion calculations  
3. **Configuration Types** - Type-safe configuration system with hierarchical policies
4. **Custom Fields** - Promotion and OrderLine metadata for policy storage

### Key Features

- **Three-Level Policy Hierarchy**: Global → Promotion → Bundle overrides
- **Pattern-Based Filtering**: Exclude/include promotions by code patterns
- **Discount Caps**: Prevent over-discounting with cumulative limits
- **Logging & Statistics**: Comprehensive tracking of guard decisions
- **Vendure Integration**: Seamless interception of promotion pipeline

## Policy Hierarchy

### 1. Global Policy (`siteWidePromosAffectBundles`)

```typescript
type BundlePromotionPolicy = 'Allow' | 'Exclude';
```

- **Allow**: External promotions can apply to bundle components (default)
- **Exclude**: External promotions are blocked from bundle components

### 2. Per-Promotion Override (`bundlePolicy`)

```typescript
type PromotionBundleOverride = 'inherit' | 'never' | 'always';
```

- **inherit**: Use global policy (default)
- **never**: This promotion never applies to bundle components  
- **always**: This promotion always applies to bundle components

### 3. Per-Bundle Override (`allowExternalPromos`)

```typescript
type BundleExternalPromosPolicy = 'inherit' | 'no' | 'yes';
```

- **inherit**: Use global/promotion policies (default)
- **no**: This bundle never accepts external promotions
- **yes**: This bundle always accepts external promotions

## Configuration

### Plugin Configuration

```typescript
const bundleConfig: BundlePluginConfig = {
  // Global policy
  siteWidePromosAffectBundles: 'Exclude', // or 'Allow'
  
  // Discount caps
  maxCumulativeDiscountPctForBundleChildren: 0.5, // Max 50% total discount
  
  // Pattern filtering  
  excludedPromotionPatterns: ['^EMPLOYEE_', 'INTERNAL_.*'],
  allowedPromotionCodes: ['BUNDLE_', 'SPECIAL_'],
  
  // Logging
  logPromotionGuardDecisions: true
};
```

### Bundle Entity Configuration

```typescript
// In Bundle entity or via Admin API
const bundle = {
  name: 'Premium Bundle',
  allowExternalPromos: 'no', // Block external promos for this bundle
  // ... other bundle fields
};
```

### Promotion Entity Configuration

```typescript  
// Via Admin API or promotion custom fields
const promotion = {
  name: '20% Off Everything',
  customFields: {
    bundlePolicy: 'never', // Never apply to bundle components
    bundleAware: true       // Promotion designed for bundles
  }
};
```

## Decision Flow

The Bundle Promotion Guard evaluates policies in this order:

1. **Bundle Line Check**: Is this a bundle component line?
2. **Header Line Check**: Skip bundle headers (never receive promotions)  
3. **Exclusion Patterns**: Check if promotion matches exclusion patterns
4. **Whitelist Patterns**: Check if promotion is in whitelist (if configured)
5. **Bundle Override**: Apply per-bundle `allowExternalPromos` policy
6. **Promotion Override**: Apply per-promotion `bundlePolicy` policy  
7. **Global Policy**: Apply `siteWidePromosAffectBundles` policy
8. **Discount Cap**: Verify cumulative discount limits

## Usage Examples

### Example 1: Conservative Setup (Block Most External Promotions)

```typescript
// Global policy: Block external promotions from bundles
siteWidePromosAffectBundles: 'Exclude'

// Bundle: Explicitly allow promotions on high-margin bundle
allowExternalPromos: 'yes'

// Promotion: Bundle-specific promotion always applies
bundlePolicy: 'always'
```

**Result**: Most external promotions blocked, but bundle-specific promotions and high-margin bundles still receive discounts.

### Example 2: Liberal Setup (Allow With Caps)

```typescript
// Global policy: Allow external promotions  
siteWidePromosAffectBundles: 'Allow'

// Discount cap: Prevent over-discounting
maxCumulativeDiscountPctForBundleChildren: 0.3

// Bundle: Block promotions on already-discounted bundle
allowExternalPromos: 'no'
```

**Result**: External promotions allowed but capped at 30% total discount, with specific bundles protected.

### Example 3: Pattern-Based Filtering

```typescript
// Block internal/employee promotions from bundles
excludedPromotionPatterns: ['^EMPLOYEE_', '^INTERNAL_', 'STAFF_.*']

// Only allow bundle-specific promotions
allowedPromotionCodes: ['BUNDLE_', 'COMBO_']

// Global policy: Allow (but patterns will filter)
siteWidePromosAffectBundles: 'Allow'
```

**Result**: Only promotions with 'BUNDLE_' or 'COMBO_' codes can apply to bundles.

## Integration Points

### 1. Vendure Promotion Pipeline

The `BundlePromotionInterceptor` hooks into Vendure's `runPromotionSideEffects` method:

```typescript
// Original Vendure flow
PromotionService.runPromotionSideEffects(ctx, order, promotions)

// Intercepted flow  
PromotionService.runPromotionSideEffects(ctx, order, filteredPromotions)
//                                               ↑ Filtered by bundle guard
```

### 2. Promotion Actions

Promotion actions can directly use the guard service:

```typescript
// In a custom promotion action
const guardService = this.moduleRef.get(BundlePromotionGuardService);

const result = await guardService.shouldPromotionApplyToBundleLine(
  ctx, orderLine, promotion
);

if (result.allowed) {
  // Apply discount
} else {
  // Skip line (blocked by bundle guard)
}
```

### 3. Order Line Filtering

```typescript
const { allowedLines, blockedLines } = await interceptor.filterOrderLinesForPromotion(
  ctx, order.lines, promotion
);

// Only apply promotion to allowedLines
```

## Monitoring & Debugging

### Guard Decision Logging

When `logPromotionGuardDecisions: true`:

```
Bundle promotion guard: BLOCK - Bundle explicitly excludes external promotions (bundle) 
{"bundlePolicy":"no","bundleId":"123","bundleName":"Premium Bundle","promotionCode":"SAVE20"}

Bundle promotion guard: ALLOW - Global policy allows promotions on bundle components (global) 
{"globalPolicy":"Allow","bundleId":"456","bundleName":"Starter Bundle","promotionCode":"WELCOME10"}
```

### Guard Statistics

```typescript
const stats = await interceptor.getOrderPromotionStatistics(ctx, order, promotions);
/*
{
  orderCode: "ORDER123",
  totalPromotions: 5,
  totalLines: 12,  
  bundleLines: 8,
  promotionResults: [
    {
      promotionName: "20% Off Everything",
      allowedLines: 2,
      blockedLines: 6,
      statistics: { ... }
    }
  ]
}
*/
```

### Guard Result Details

```typescript
const result = await guardService.shouldPromotionApplyToBundleLine(ctx, line, promotion);
/*
{
  allowed: false,
  reason: "Bundle explicitly excludes external promotions",
  decidingPolicy: "bundle",
  currentDiscountPct: 0.15,
  metadata: {
    globalPolicy: "Allow",
    bundlePolicy: "no",
    bundleId: "123",
    bundleName: "Premium Bundle",
    promotionCode: "SAVE20"
  }
}
*/
```

## Error Handling

The guard system gracefully handles edge cases:

- **Missing Configuration**: Uses sensible defaults
- **Invalid Policies**: Falls back to global policy  
- **Service Unavailability**: Allows promotions (fail-open)
- **Performance Issues**: Implements result caching and batching

## Performance Considerations

- **Caching**: Guard decisions cached per promotion/line combination
- **Batching**: Order-level evaluation for better performance
- **Early Returns**: Pattern matching and policy checks optimized for speed
- **Lazy Loading**: Services loaded only when needed

## Testing

### Unit Tests

```typescript
describe('BundlePromotionGuardService', () => {
  it('should block promotions when global policy is Exclude', async () => {
    // Test global policy blocking
  });
  
  it('should allow bundle override of global policy', async () => {
    // Test bundle-level overrides
  });
  
  it('should respect promotion-level overrides', async () => {
    // Test promotion-level overrides  
  });
  
  it('should enforce discount caps', async () => {
    // Test cumulative discount limits
  });
});
```

### Integration Tests

```typescript
describe('Bundle Promotion Guard Integration', () => {
  it('should filter promotions in order calculation', async () => {
    // Test end-to-end promotion filtering
  });
  
  it('should log guard decisions when enabled', async () => {
    // Test logging functionality
  });
});
```

## Migration Notes

### From Phase 3.1

Phase 3.2 is fully backward compatible with Phase 3.1:

- Existing bundle promotions continue to work unchanged
- New guard system only affects external (non-bundle) promotions  
- Default policies preserve existing behavior

### Enabling Phase 3.2

1. **Update Plugin Registration**: Include new services in providers
2. **Configure Policies**: Set global and per-bundle policies
3. **Update Promotions**: Add bundle policies to existing promotions
4. **Test Integration**: Verify promotion filtering works as expected

### Rollback Plan

The guard system can be disabled by:

```typescript
// Restore original promotion calculation
await interceptor.restoreOriginalPromotionCalculation();
```

## Security Considerations

- **Policy Validation**: All policies validated against known types
- **Access Control**: Admin-only access to promotion guard configuration
- **Audit Trail**: All guard decisions logged for compliance
- **Rate Limiting**: Guard evaluation protected against abuse

## Future Enhancements

- **Dynamic Policies**: Runtime policy updates without restart
- **A/B Testing**: Different policies for different customer segments
- **Machine Learning**: AI-powered promotion conflict detection  
- **Analytics**: Advanced reporting on promotion interactions

## Phase 3.2 Completion

Phase 3.2 represents the completion of the Bundle Plugin v2 promotion system:

✅ **Phase 3.1**: Bundle promotion actions and conditions  
✅ **Phase 3.2**: Bundle promotion guard system

The system now provides:
- Complete bundle pricing without recomputation
- Comprehensive promotion integration
- Granular policy control over promotion interactions
- Production-ready double-discounting prevention

**Next**: Phase 4 will focus on advanced bundle features like dynamic pricing, bundle recommendations, and analytics.