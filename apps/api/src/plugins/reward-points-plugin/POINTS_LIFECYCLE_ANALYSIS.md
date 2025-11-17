# Reward Points Lifecycle Analysis

## Current Implementation Status

### What Currently Works ✅

1. **Points Reservation (Checkout)**
   - When customer applies points during checkout
   - Points are marked as "reserved" in `order.customFields.pointsReserved`
   - Reserved points are NOT deducted from balance yet
   - `availablePoints = balance - reservedPoints` ensures they can't be double-spent

2. **Points Redemption (PaymentSettled)**
   - Event: `OrderStateTransitionEvent` → `toState = 'PaymentSettled'`
   - Reserved points are converted to redeemed points
   - Actually deducted from customer balance via `redeemPoints()`
   - Transaction created with type `REDEEMED`
   - `order.customFields.pointsReserved = 0`
   - `order.customFields.pointsRedeemed = X`

3. **Points Earning (PaymentSettled)**
   - After redemption, earned points are calculated and awarded
   - Based on order total (excluding shipping and points discount)
   - Transaction created with type `EARNED`
   - `order.customFields.pointsEarned = X`

---

## Critical Missing Functionality ❌

### Problem Scenarios

#### Scenario 1: Payment Declined/Failed
**Current State:** `ArrangingPayment` → `PaymentDeclined`
- **Issue:** Reserved points stay reserved forever
- **Impact:** Customer loses access to those points permanently
- **What Should Happen:** Release reserved points back to available

#### Scenario 2: Order Cancelled (Before Payment)
**Current State:** `ArrangingPayment` → `Cancelled`
- **Issue:** Reserved points stay reserved
- **Impact:** Points locked indefinitely
- **What Should Happen:** Release reserved points immediately

#### Scenario 3: Order Cancelled (After Payment)
**Current State:** `PaymentSettled` → `Cancelled`
- **Issue:** 
  - Points were already redeemed (deducted)
  - Points were already earned (awarded)
  - Need to reverse BOTH operations
- **What Should Happen:** 
  - Refund redeemed points
  - Remove earned points (with validation)

#### Scenario 4: Partial Refund
**Current State:** Order remains `PaymentSettled` or `Delivered`, but refund issued
- **Issue:** Customer keeps earned points on full order amount
- **What Should Happen:** Proportionally reduce earned points

---

## Vendure Order State Machine

### Standard Order States
```
Created
  ↓
AddingItems (customer shopping)
  ↓
ArrangingPayment (checkout, points reserved here)
  ↓
PaymentAuthorized (payment processed but not settled)
  ↓
PaymentSettled (✅ currently handled - redeem + earn points)
  ↓
PartiallyShipped
  ↓
Shipped
  ↓
PartiallyDelivered
  ↓
Delivered
  ↓
Modifying (order modification in progress)

Side branches:
- Cancelled (can happen from multiple states)
- Draft (admin-created orders)
```

### Payment State Transitions
```
AddingItems → ArrangingPayment (points reserved)
  ↓
  ├─→ PaymentAuthorized → PaymentSettled (redeem reserved, earn new)
  ├─→ PaymentDeclined (NEED TO RELEASE RESERVED)
  └─→ Cancelled (NEED TO RELEASE RESERVED)

PaymentSettled → Cancelled (NEED TO REFUND REDEEMED + REMOVE EARNED)
```

---

## Required Event Handlers

### 1. Release Reserved Points
**Events to Handle:**
- `ArrangingPayment` → `Cancelled`
- `ArrangingPayment` → `PaymentDeclined`  
- `PaymentAuthorized` → `Cancelled`
- Any state with `pointsReserved > 0` → `Cancelled`

**Actions:**
```typescript
if (order.customFields.pointsReserved > 0) {
  // Clear reservation (points become available again)
  order.customFields.pointsReserved = 0;
  
  // Log transaction for audit trail
  createTransaction({
    type: 'RELEASED',
    points: originalReserved,
    description: `Reserved points released due to order cancellation`
  });
}
```

### 2. Refund Redeemed Points
**Events to Handle:**
- `PaymentSettled` → `Cancelled`
- `Delivered` → `Cancelled`

**Actions:**
```typescript
if (order.customFields.pointsRedeemed > 0) {
  // Add points back to customer balance
  await adjustCustomerPoints(
    customerId,
    +order.customFields.pointsRedeemed,
    `Refund for cancelled order ${order.code}`
  );
  
  // Update order
  order.customFields.pointsRefunded = order.customFields.pointsRedeemed;
  order.customFields.pointsRedeemed = 0;
}
```

### 3. Remove Earned Points
**Events to Handle:**
- `PaymentSettled` → `Cancelled`
- `Delivered` → `Cancelled`

**Actions:**
```typescript
if (order.customFields.pointsEarned > 0) {
  const availablePoints = await getAvailablePoints(customerId);
  const pointsToRemove = Math.min(
    order.customFields.pointsEarned,
    availablePoints
  );
  
  // Remove points (only up to available to protect reserved)
  await adjustCustomerPoints(
    customerId,
    -pointsToRemove,
    `Removal of earned points for cancelled order ${order.code}`
  );
  
  if (pointsToRemove < order.customFields.pointsEarned) {
    Logger.warn(
      `Could only remove ${pointsToRemove} of ${order.customFields.pointsEarned} ` +
      `earned points - customer has already spent some`
    );
  }
  
  order.customFields.pointsRemoved = pointsToRemove;
}
```

### 4. Handle Partial Refunds
**Events to Handle:**
- `RefundStateTransitionEvent` (Vendure refund events)

**Actions:**
```typescript
const refundPercentage = refundAmount / order.totalWithTax;
const earnedPointsToRemove = Math.floor(
  order.customFields.pointsEarned * refundPercentage
);

await adjustCustomerPoints(
  customerId,
  -earnedPointsToRemove,
  `Partial refund adjustment for order ${order.code}`
);
```

---

## New Order CustomFields Needed

Add to order entity:
```typescript
{
  pointsReserved: number;      // ✅ exists
  pointsRedeemed: number;      // ✅ exists  
  pointsEarned: number;        // ✅ exists
  pointsDiscountValue: number; // ✅ exists
  
  // NEW FIELDS NEEDED:
  pointsReleased: number;      // ❌ add - points released from reservation
  pointsRefunded: number;      // ❌ add - redeemed points refunded on cancellation
  pointsRemoved: number;       // ❌ add - earned points removed on cancellation
}
```

---

## New Transaction Types Needed

Current types:
- `EARNED` ✅
- `REDEEMED` ✅
- `ADJUSTED` ✅ (admin manual adjustment)

New types needed:
- `RELEASED` ❌ - reserved points released (payment declined/cancelled)
- `REFUNDED` ❌ - redeemed points refunded (order cancelled after payment)
- `REMOVED` ❌ - earned points removed (order cancelled after earning)

---

## Implementation Priority

### Phase 1: Critical (Prevent Data Loss) 🔴
1. **Release reserved points on cancellation/decline**
   - Prevents customer from losing points forever
   - Most common edge case

### Phase 2: Important (Data Integrity) 🟡  
2. **Refund redeemed points on cancellation**
   - Returns points customer paid with
3. **Remove earned points on cancellation**
   - Prevents earning points on cancelled orders

### Phase 3: Nice-to-Have 🟢
4. **Handle partial refunds**
   - Proportional point adjustments

---

## Testing Scenarios

### Test Case 1: Payment Declined
1. Customer has 1000 points
2. Reserve 500 points during checkout
3. Payment fails/declined
4. **Expected:** 1000 points available again

### Test Case 2: Order Cancelled Before Payment
1. Customer has 1000 points  
2. Reserve 500 points at checkout
3. Cancel order before payment
4. **Expected:** 1000 points available again

### Test Case 3: Order Cancelled After Payment
1. Customer has 1000 points
2. Use 500 points, earn 200 points on order
3. Order cancelled after payment settled
4. **Expected:** 
   - 500 redeemed points refunded
   - 200 earned points removed
   - Final: 1000 + 500 - 200 = 1300 points

### Test Case 4: Customer Spends Earned Points Then Cancels
1. Customer has 100 points
2. Places order, earns 50 points → 150 total
3. Spends 150 points on another order (reserve)
4. Original order cancelled
5. **Expected:**
   - Can't remove 50 earned points (they're reserved)
   - Only available points can be removed
   - Admin sees warning in logs

---

## Recommended Next Steps

1. ✅ Add new customFields to Order entity
2. ✅ Add new transaction types to RewardTransaction enum
3. ✅ Implement event handler for order cancellation
4. ✅ Implement event handler for payment decline
5. ✅ Add tests for all scenarios
6. ✅ Update admin UI to show release/refund/removal transactions
7. ✅ Add migration for existing orders with orphaned reserved points

---

## SQL Query to Find Affected Orders

```sql
-- Find orders with reserved points that are cancelled/declined
SELECT id, code, state, "customFields"
FROM "order"  
WHERE 
  "customFields"->>'pointsReserved' IS NOT NULL
  AND CAST("customFields"->>'pointsReserved' AS INTEGER) > 0
  AND state IN ('Cancelled', 'PaymentDeclined');
```
