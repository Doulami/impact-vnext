# Bundle Promotion Guardrails & Coupon System - Implementation Plan

**Status:** Planning Phase  
**Priority:** HIGH - Prevents double-discounting and over-selling  
**Estimated Effort:** 8-12 hours

---

## Executive Summary

This document outlines the implementation plan for activating and completing the bundle promotion guardrails system. The system prevents double-discounting when external promotions/coupons are applied to bundles and enforces bundle capacity limits (bundleCap).

### What Already Exists ✅
- **Backend Guard Logic:** Complete `BundlePromotionGuardService` with policy hierarchy
- **Bundle Entity Field:** `allowExternalPromos` (per-bundle control)
- **Promotion CustomFields:** `bundlePolicy`, `bundleAware`
- **Backend Cap Validation:** `addBundleToOrder` checks bundleCap availability
- **Interceptor Service:** `BundlePromotionInterceptor` (currently disabled)

### What's Missing ❌
- **Active Guard Enforcement:** Interceptor is commented out
- **Frontend Coupon UI:** No coupon code input in checkout
- **Frontend Cap Validation:** "Add to Cart" allows exceeding bundleCap
- **Promotion Display:** Order summaries don't show applied discounts
- **Admin UI Switch:** No UI for `allowExternalPromos` field
- **Global Config UI:** No admin setting for `siteWidePromosAffectBundles`

---

## Phase 1: Backend - Bundle Cap Enforcement

**Priority:** CRITICAL  
**Effort:** 2-3 hours

### Current Behavior
- **Backend:** `addBundleToOrder` resolver validates bundleCap (lines 118-129 in `bundle-v3.resolver.ts`)
- **Frontend:** `addBundleToCart` helper does NOT check `bundleAvailability` or `maxQuantity`
- **Result:** Users can add bundles to cart that will fail at checkout

### Implementation Steps

#### 1.1 Frontend - Add Availability Query
**File:** `apps/web/src/lib/graphql/queries.ts`

```typescript
// Add new query for bundle availability
export const GET_BUNDLE_AVAILABILITY = gql`
  query GetBundleAvailability($bundleId: ID!) {
    bundleAvailability(bundleId: $bundleId) {
      isAvailable
      maxQuantity
      status
      reason
    }
  }
`;
```

#### 1.2 Frontend - Update addBundleToCart Helper
**File:** `apps/web/src/lib/helpers/bundleCart.ts`

**Changes:**
1. Query bundle availability before returning cart item
2. Store `maxQuantity` in cart item
3. Return availability error if bundle not available

```typescript
export async function addBundleToCart(params: AddBundleToCartParams) {
  // ... existing code ...
  
  // NEW: Check bundle availability
  const { data: availabilityData } = await apolloClient.query({
    query: GET_BUNDLE_AVAILABILITY,
    variables: { bundleId }
  });
  
  const availability = availabilityData?.bundleAvailability;
  
  if (!availability?.isAvailable) {
    throw new Error(availability?.reason || 'Bundle is not available');
  }
  
  // Validate requested quantity against maxQuantity
  if (quantity > availability.maxQuantity) {
    throw new Error(
      `Only ${availability.maxQuantity} bundles available. Requested: ${quantity}`
    );
  }
  
  return {
    // ... existing fields ...
    maxQuantity: availability.maxQuantity, // NEW: Store for cart UI
    availabilityStatus: availability.status
  };
}
```

#### 1.3 Frontend - Enforce in Cart Quantity Updates
**Files:** ProductCard, BundleCard, Cart components

**Changes:**
- Disable quantity increase if current quantity >= maxQuantity
- Show availability warning: "Only X available"
- Update cart UI to display remaining availability

#### 1.4 Testing Scenarios
1. ✅ Bundle with `bundleCap: 10`, try adding 11 → Error
2. ✅ Bundle with `bundleCap: 5`, add 3, then try increasing to 6 → Blocked
3. ✅ Bundle with no cap → Allow unlimited quantity
4. ✅ Bundle with `bundleCap` reached → "Out of Stock"

---

## Phase 2: Backend - Activate Promotion Guards

**Priority:** HIGH  
**Effort:** 3-4 hours

### Current State
- Guard service implemented but interceptor disabled (line 9, 51 in `bundle.plugin.ts`)
- Promotions CAN currently double-discount bundles (unsafe)

### Implementation Steps

#### 2.1 Enable BundlePromotionInterceptor
**File:** `apps/api/src/plugins/bundle-plugin/bundle.plugin.ts`

**Changes:**
```typescript
// Line 9: UNCOMMENT
import { BundlePromotionInterceptor } from './promotions/bundle-promotion-interceptor';

// Line 51: UNCOMMENT
providers: [
  // ... other services ...
  BundlePromotionInterceptor, // RE-ENABLE
  // ...
]
```

#### 2.2 Configure Global Policy
**File:** `apps/api/src/vendure-config.ts`

**Add configuration:**
```typescript
import { BundlePlugin } from './plugins/bundle-plugin/bundle.plugin';

// In plugins array:
BundlePlugin.init({
  // GLOBAL POLICY: Choose one
  siteWidePromosAffectBundles: 'Exclude', // RECOMMENDED: Safe, no double-discounts
  // OR
  // siteWidePromosAffectBundles: 'Allow', // Risky, requires per-bundle control
  
  // Optional: Set discount cap
  maxCumulativeDiscountPctForBundleChildren: 0.50, // 50% max total discount
  
  // Enable logging for debugging
  logPromotionGuardDecisions: true, // Set to false in production
  
  // Guard mode
  guardMode: 'strict', // Recommended
})
```

#### 2.3 Decision Hierarchy (Documented)
The guard service evaluates in this order:

1. **Exclusion Patterns** (highest priority) - Block specific promo codes
2. **Whitelist Patterns** - Only allow specific promo codes
3. **Per-Bundle Override** (`allowExternalPromos`):
   - `'no'` → Block all external promotions (strictest)
   - `'yes'` → Allow external promotions (override global)
   - `'inherit'` → Use promotion/global policy
4. **Per-Promotion Override** (`bundlePolicy` customField):
   - `'never'` → Never apply to bundles
   - `'always'` → Always apply to bundles
   - `'inherit'` → Use global policy
5. **Global Policy** (`siteWidePromosAffectBundles`):
   - `'Exclude'` → Block by default
   - `'Allow'` → Allow by default
6. **Discount Cap** - Prevent over-discounting

#### 2.4 Testing Scenarios
1. ✅ Global='Exclude', bundle.allowExternalPromos='inherit', apply coupon → BLOCKED
2. ✅ Global='Exclude', bundle.allowExternalPromos='yes', apply coupon → ALLOWED
3. ✅ Global='Allow', bundle.allowExternalPromos='no', apply coupon → BLOCKED
4. ✅ Discount cap 50%, bundle discount 30%, coupon 25% → BLOCKED (55% total)
5. ✅ Promotion.bundlePolicy='never', apply to bundle order → BLOCKED

---

## Phase 3: Frontend - Coupon Code UI

**Priority:** HIGH  
**Effort:** 3-4 hours

### Implementation Steps

#### 3.1 Add Vendure Coupon Mutations
**File:** `apps/web/src/lib/graphql/checkout.ts`

```typescript
// Add coupon code mutations
export const APPLY_COUPON_CODE = gql`
  mutation ApplyCouponCode($couponCode: String!) {
    applyCouponCode(couponCode: $couponCode) {
      ... on Order {
        id
        code
        couponCodes
        discounts {
          description
          amountWithTax
        }
        subTotalWithTax
        totalWithTax
      }
      ... on CouponCodeInvalidError {
        errorCode
        message
        couponCode
      }
      ... on CouponCodeExpiredError {
        errorCode
        message
        couponCode
      }
      ... on CouponCodeLimitError {
        errorCode
        message
        couponCode
        limit
      }
    }
  }
`;

export const REMOVE_COUPON_CODE = gql`
  mutation RemoveCouponCode($couponCode: String!) {
    removeCouponCode(couponCode: $couponCode) {
      ... on Order {
        id
        code
        couponCodes
        discounts {
          description
          amountWithTax
        }
        subTotalWithTax
        totalWithTax
      }
    }
  }
`;
```

#### 3.2 Update Order Query to Include Coupons
**File:** `apps/web/src/lib/graphql/checkout.ts`

**Update `GET_ORDER_FOR_CHECKOUT` query:**
```typescript
export const GET_ORDER_FOR_CHECKOUT = gql`
  query GetOrderForCheckout {
    activeOrder {
      id
      code
      state
      couponCodes      # ADD
      discounts {      # ADD
        description
        amountWithTax
      }
      lines {
        # ... existing fields ...
      }
      subTotalWithTax
      shippingWithTax
      totalWithTax
    }
  }
`;
```

#### 3.3 Create CouponCodeInput Component
**File:** `apps/web/src/components/CouponCodeInput.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { APPLY_COUPON_CODE, REMOVE_COUPON_CODE } from '@/lib/graphql/checkout';
import Button from './Button';
import { X } from 'lucide-react';

interface CouponCodeInputProps {
  appliedCoupons: string[];
  onSuccess?: () => void;
}

export default function CouponCodeInput({ appliedCoupons, onSuccess }: CouponCodeInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const [applyCoupon] = useMutation(APPLY_COUPON_CODE);
  const [removeCoupon] = useMutation(REMOVE_COUPON_CODE);

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplying(true);
    setError('');
    
    try {
      const result = await applyCoupon({
        variables: { couponCode: couponCode.trim().toUpperCase() }
      });
      
      if (result.data?.applyCouponCode.__typename === 'Order') {
        setCouponCode('');
        onSuccess?.();
      } else {
        // Handle error types
        const errorResult = result.data?.applyCouponCode;
        setError(errorResult?.message || 'Invalid coupon code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply coupon code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = async (code: string) => {
    try {
      await removeCoupon({ variables: { couponCode: code } });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to remove coupon code');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Enter coupon code"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
          disabled={isApplying}
        />
        <Button
          onClick={handleApply}
          disabled={isApplying || !couponCode.trim()}
          variant="secondary"
        >
          {isApplying ? 'Applying...' : 'Apply'}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {appliedCoupons.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Applied Coupons:</p>
          {appliedCoupons.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded"
            >
              <span className="text-sm font-medium text-green-800">{code}</span>
              <button
                onClick={() => handleRemove(code)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### 3.4 Integrate into Checkout Page
**File:** `apps/web/src/app/checkout/page.tsx`

**Add after order summary, before payment:**
```typescript
import CouponCodeInput from '@/components/CouponCodeInput';

// In component:
const { data: orderData, refetch: refetchOrder } = useQuery(GET_ORDER_FOR_CHECKOUT);
const activeOrder = orderData?.activeOrder;

// In JSX (after cart items, before payment):
<div className="mb-6">
  <h3 className="text-lg font-semibold mb-3">Coupon Code</h3>
  <CouponCodeInput
    appliedCoupons={activeOrder?.couponCodes || []}
    onSuccess={() => refetchOrder()}
  />
</div>
```

#### 3.5 Testing Scenarios
1. ✅ Apply valid coupon → Success, shows in applied list
2. ✅ Apply invalid coupon → Error message displayed
3. ✅ Apply expired coupon → Error message displayed
4. ✅ Remove applied coupon → Coupon removed, totals updated
5. ✅ Apply coupon to bundle with `allowExternalPromos: false` → Backend blocks it

---

## Phase 4: Frontend - Promotion Display

**Priority:** MEDIUM  
**Effort:** 2-3 hours

### Implementation Steps

#### 4.1 Update Order Summary Component
**Files:** Checkout, Thank You, Order Details pages

**Add discount breakdown:**
```typescript
// Display promotions and discounts
<div className="space-y-2">
  {/* Subtotal */}
  <div className="flex justify-between text-gray-700">
    <span>Subtotal</span>
    <span>${(order.subTotalWithTax / 100).toFixed(2)}</span>
  </div>

  {/* Applied Coupons */}
  {order.couponCodes?.length > 0 && (
    <div className="flex justify-between text-sm text-gray-600">
      <span className="flex items-center gap-2">
        <span>Coupons:</span>
        {order.couponCodes.map(code => (
          <span key={code} className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
            {code}
          </span>
        ))}
      </span>
    </div>
  )}

  {/* Discounts */}
  {order.discounts?.map((discount, idx) => (
    <div key={idx} className="flex justify-between text-sm text-green-600">
      <span>{discount.description}</span>
      <span>-${(discount.amountWithTax / 100).toFixed(2)}</span>
    </div>
  ))}

  {/* Shipping */}
  <div className="flex justify-between text-gray-700">
    <span>Shipping</span>
    <span>${(order.shippingWithTax / 100).toFixed(2)}</span>
  </div>

  {/* Total */}
  <div className="flex justify-between text-lg font-bold pt-2 border-t">
    <span>Total</span>
    <span>${(order.totalWithTax / 100).toFixed(2)}</span>
  </div>
</div>
```

#### 4.2 Pages to Update
1. **Checkout page** - Order summary sidebar
2. **Thank you page** - Order details
3. **Account orders page** - Order history details

---

## Phase 5: Admin UI - Bundle Configuration

**Priority:** MEDIUM  
**Effort:** 2-3 hours

### Implementation Steps

#### 5.1 Add allowExternalPromos Toggle
**File:** `apps/api/src/plugins/bundle-plugin/ui/bundle-detail.component.html`

**Add after bundleCap field (line 194):**
```html
<!-- Promotion Policy Section -->
<vdr-form-field 
    [label]="'Allow External Promotions' | translate" 
    for="allowExternalPromos"
    tooltip="Allow external promotion codes/coupons to be applied to this bundle">
    <vdr-form-item-toggle
        id="allowExternalPromos"
        formControlName="allowExternalPromos"
    ></vdr-form-item-toggle>
    <small class="text-muted d-block mt-1">
        When OFF, promotion codes and coupons will NOT apply to this bundle (prevents double-discounting).
        When ON, external promotions can apply (bundle discount + promo discount).
    </small>
</vdr-form-field>
```

#### 5.2 Update TypeScript Component
**File:** `apps/api/src/plugins/bundle-plugin/ui/bundle-detail.component.ts`

**Add to form initialization:**
```typescript
// In buildForm() method:
this.bundleForm = this.formBuilder.group({
  // ... existing fields ...
  allowExternalPromos: [bundle?.allowExternalPromos ?? false], // ADD THIS
  // ...
});
```

**Add to save logic:**
```typescript
// In save() method, include in CreateBundleInput/UpdateBundleInput:
{
  // ... existing fields ...
  allowExternalPromos: this.bundleForm.value.allowExternalPromos,
}
```

#### 5.3 Add Global Config UI (Optional - Advanced)
**File:** Create new settings page `apps/api/src/plugins/bundle-plugin/ui/bundle-settings.component.html`

**Note:** This requires extending Vendure's Admin UI with custom settings page. Consider lower priority.

---

## Testing Plan

### Unit Tests
1. **BundlePromotionGuardService**
   - Test all policy combinations
   - Test discount cap enforcement
   - Test pattern matching

2. **Bundle Cap Validation**
   - Test frontend availability checks
   - Test backend availability query
   - Test quantity increase blocking

### Integration Tests
1. **End-to-End Coupon Flow**
   - Apply coupon to regular product → Success
   - Apply coupon to bundle with `allowExternalPromos: false` → Blocked
   - Apply coupon to bundle with `allowExternalPromos: true` → Success
   - Verify pricing calculations

2. **Bundle Cap Flow**
   - Add bundle with cap=5, quantity=3 → Success
   - Try increasing to 6 → Blocked
   - Verify cart shows "Only 5 available"

### Manual Test Scenarios
1. Create bundle with 30% discount, `allowExternalPromos: false`
2. Add to cart, try applying 20% coupon → Should be blocked
3. Enable `allowExternalPromos: true`
4. Apply same coupon → Should work (50% total discount)
5. Set discount cap to 40% → Should block at 40%

---

## Rollout Strategy

### Phase 1: Enable Guards (Week 1)
1. Enable `BundlePromotionInterceptor`
2. Set global policy to `'Exclude'` (safe default)
3. Deploy to staging, test thoroughly
4. Monitor logs for guard decisions

### Phase 2: Frontend Enhancements (Week 2)
1. Add coupon code UI to checkout
2. Implement bundle cap validation
3. Update promotion display
4. Deploy to staging

### Phase 3: Admin UI (Week 3)
1. Add `allowExternalPromos` toggle
2. Test admin workflows
3. Train staff on new settings
4. Deploy to production

### Phase 4: Production Rollout (Week 4)
1. Deploy all changes to production
2. Monitor for double-discount issues
3. Monitor for over-selling issues
4. Adjust policies based on feedback

---

## Configuration Recommendations

### For Most Stores (Safe Approach)
```typescript
BundlePlugin.init({
  siteWidePromosAffectBundles: 'Exclude', // Safe default
  maxCumulativeDiscountPctForBundleChildren: 0.50, // 50% max
  guardMode: 'strict',
  logPromotionGuardDecisions: false, // Production
})
```

**Per-Bundle Settings:**
- Default: `allowExternalPromos: false` (inherit 'Exclude')
- Special bundles: `allowExternalPromos: true` (opt-in for specific promotions)

### For Flexible Stores (Risky - Requires Management)
```typescript
BundlePlugin.init({
  siteWidePromosAffectBundles: 'Allow', // Flexible but risky
  maxCumulativeDiscountPctForBundleChildren: 0.60, // 60% max
  guardMode: 'strict',
  excludedPromotionPatterns: ['BOGO.*', 'FLASH.*'], // Block specific promos
})
```

**Per-Bundle Settings:**
- Default: `allowExternalPromos: true` (allow by default)
- High-discount bundles: `allowExternalPromos: false` (opt-out to prevent over-discounting)

---

## Known Limitations

1. **Promotion Display:** Vendure doesn't separate bundle discounts from promotion discounts in the `discounts` array. Frontend needs to infer bundle discounts from line item pricing.

2. **Reservation Race Conditions:** `bundleReservedOpen` counter can drift if orders are cancelled/modified rapidly. Run consistency checks periodically.

3. **Admin UI Config:** Global `siteWidePromosAffectBundles` setting requires code-level configuration (vendure-config.ts). No Admin UI settings page yet.

4. **Promotion Metadata:** Setting `bundlePolicy` on promotions requires manual database edits or custom Admin UI extension.

---

## Success Metrics

### Post-Implementation KPIs
1. **Zero Double-Discount Incidents** - No bundles receiving >50% total discount
2. **Zero Over-Sells** - No orders exceeding bundleCap
3. **Coupon Usage Rate** - Track coupon application success rate
4. **Bundle Conversion Rate** - Monitor impact of promotion restrictions

### Monitoring
1. Enable `logPromotionGuardDecisions: true` temporarily
2. Monitor logs for blocked promotions
3. Track customer support tickets for "coupon not working"
4. Monitor order cancellations due to bundle unavailability

---

## Future Enhancements

1. **Admin Settings Page** - UI for global promotion policy
2. **Promotion Bundle Rules** - Advanced per-promotion bundle targeting
3. **Dynamic Discount Caps** - Per-bundle discount cap overrides
4. **Reservation Buffer** - Reserve extra capacity for VIP customers
5. **Bundle Analytics Dashboard** - Track promotion interactions

---

## Documentation Updates Needed

1. **Merchant Documentation** - How to configure bundle promotion policies
2. **Developer Documentation** - Guard service API and extension points
3. **Admin User Guide** - Using allowExternalPromos toggle
4. **Troubleshooting Guide** - Common promotion blocking scenarios

---

## Questions for Stakeholders

1. **Global Policy Decision:** Should we default to `'Exclude'` (safe) or `'Allow'` (flexible)?
2. **Discount Cap:** What's the maximum acceptable total discount? (Recommend 50%)
3. **Coupon Display Priority:** Should we show coupon input prominently or hide it in accordion?
4. **Bundle Cap Messaging:** How should we communicate "limited availability" to customers?
5. **Promo Patterns:** Are there specific promotion types (BOGO, etc.) that should NEVER apply to bundles?

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-14  
**Author:** Warp AI Agent  
**Status:** Ready for Implementation
