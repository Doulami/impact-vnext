# Double Subtraction Bug Fix

## Issue Description

**Bug:** Points earned calculation was subtracting the points discount twice, resulting in customers earning fewer points than they should.

**Reported Scenario:**
- Customer had: 100 points
- Order total: $100
- Redeemed: 100 points ($1 discount with 0.01 redeem rate)
- Expected result: 99 points (earn on $99 cash paid)
- Actual result: **98 points** ❌

---

## Root Cause Analysis

### How Vendure Promotions Work

1. **Promotion Action Returns Negative Adjustment:**
   ```typescript
   // In reward-points-order-discount.action.ts line 109
   return -finalDiscountAmount; // e.g., -100 cents for $1 discount
   ```

2. **Vendure Automatically Applies This to Order Total:**
   ```
   order.subTotal = $100 (10000 cents)
   promotion adjustment = -100 cents
   order.totalWithTax = $99 (9900 cents) ✅ Already discounted!
   ```

3. **Our Bug - We Subtracted AGAIN:**
   ```typescript
   // OLD CODE (WRONG)
   orderTotal = order.totalWithTax; // $99 (already has discount applied)
   orderTotal -= shippingWithTax;   // $99
   orderTotal -= pointsDiscountValue; // $98 ❌ DOUBLE SUBTRACTION!
   ```

---

## The Fix

### What Changed

**File:** `reward-points-event-handlers.service.ts`  
**Method:** `calculateOrderTotalForPoints()`  
**Lines:** 257-260

**Before:**
```typescript
// Subtract any points redemption discount that was already applied
const pointsDiscountValue = order.customFields?.pointsDiscountValue || 0;
if (pointsDiscountValue > 0) {
    // Subtract the redeemed points discount - customers should only earn on cash paid
    orderTotal -= pointsDiscountValue; // ❌ WRONG - already subtracted by Vendure
    Logger.debug(/* ... */);
}
```

**After:**
```typescript
// NOTE: We do NOT subtract pointsDiscountValue here because order.totalWithTax 
// already has the points discount applied by Vendure's promotion system.
// The promotion action returns a negative adjustment which Vendure automatically 
// subtracts from the order total. Subtracting it again would be double-counting.
```

---

## Verification

### Test Case: $100 Order with $1 Points Discount

| Step | Value | Notes |
|------|-------|-------|
| Cart subtotal | $100.00 | 10000 cents |
| Points redeemed | 100 points | |
| Redeem rate | 0.01 | $0.01 per point |
| Discount amount | $1.00 | 100 cents |
| **Promotion applies** | -$1.00 | Vendure does this |
| **order.totalWithTax** | **$99.00** | ✅ Already discounted |
| Shipping | $0.00 | 0 cents |
| **Effective total for earning** | **$99.00** | 9900 cents |
| Earn rate | 1.0 | 1 point per $1 |
| **Points earned** | **99 points** | ✅ CORRECT |

### Expected Results After Fix

**Starting balance:** 100 points

**After order settled:**
1. Redeem 100 points → Balance: 0
2. Earn 99 points → Balance: **99** ✅

**Previous (buggy) result:** 98 points ❌

---

## Key Takeaway

**`order.totalWithTax` already includes all promotions/discounts applied by Vendure.**

When calculating points earned:
- ✅ **DO** subtract shipping (customers shouldn't earn on shipping)
- ❌ **DON'T** subtract point discounts again (already in the total)

---

## Related Files

- `reward-points-event-handlers.service.ts` (lines 249-270)
- `reward-points-order-discount.action.ts` (promotion that applies the discount)
- `reward-points.service.ts` (calculation methods)

---

## Date Fixed

2025-11-17

## Tested By

User confirmed the issue and fix was applied.
