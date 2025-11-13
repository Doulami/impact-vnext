# Bundle v3 Implementation Plan
## Shell-Based Availability & Order Tracking

**Last Updated:** 2025-11-11  
**Status:** Planning Complete - Ready for Phase 1

---

## Context: v2 vs v3

### What v2 Has (Current Implementation)
- ✅ Bundle entity with items, discount types, status lifecycle
- ✅ Shell Product auto-creation for SEO/PLP
- ✅ Exploded orders (child variants only in order lines)
- ✅ Fixed & percentage discount support
- ✅ Asset management with featured assets
- ✅ Basic availability calculation from component stock
- ✅ Cart validation with availability checks

### What v3 Adds (This Implementation)
- 🎯 **Reserved (open) bundles tracking** on shell variant
- 🎯 **Virtual stock calculation** (Bundle Cap - Reserved)
- 🎯 **Bundle summary on Order** (shellVariantId + qty + display info)
- 🎯 **bundleGroupId on OrderLine** for grouping child lines
- 🎯 **Order state hooks** (Payment → increment Reserved, Shipped → decrement)
- 🎯 **Enhanced Admin UI** with Cap/Reserved/Virtual display
- 🎯 **Bundle cards everywhere** (cart, checkout, thank you, orders, emails)

### Key Difference
v2 tracks availability via component stock only.  
v3 adds a **capacity/reservation system** on the shell to control sellable quantity independently.

---

## Goals

1. **Keep shell products** for catalog/search speed, SEO, and a single visible bundle price
2. **Keep orders financially clean**: only child variants carry price, tax, and stock
3. **Track availability** via the shell without exposing child prices to shoppers

---

## Core Model

### Shell (Variant)
- Has a manual **Bundle Cap** (source of truth for how many bundles can be sold)
- Tracks **Reserved (open)** bundles (paid but not shipped/cancelled)
- Exposes **Virtual bundle stock** = `max(0, Bundle Cap − Reserved)` for PDP/PLP/search
- Inventory setting: **Do not track** (shell never appears as an order line)

### Order
- Stores a **Bundles summary** (shellVariantId + qty + display name/price + components list)
- (Optional) child order lines carry a hidden **bundleGroupId** so admin UI can group them

---

## User Experience

### Storefront & Receipts

**Checkout / Thank-you / My Orders:**
- Show one "bundle card" per bundle (like cart page currently shows bundle products)
- Inside the card, list component names + qty only (no component prices)
- Totals match the bundle price the customer saw

**Emails / Invoices:**
- Prefer a single "Bundle: {name} × qty" line with a component sublist (no component prices)

---

## Hidden Accounting (What Really Gets Ordered)

- Cart/checkout actually add **only child variants** (they hold the real price/tax/stock)
- Any bundle discount is allocated across child lines internally so sums equal the bundle total shown to the user
  - If fixed price: math should detect percentage and then apply on children
- **Shell is never an order line** ⚠️ **CRITICAL: Currently BROKEN - shell is being added as header line**

---

## Order State → Shell Counters (Availability Control)

| Event | Action |
|-------|--------|
| **Payment Settled** | Increment shell Reserved (open) by bundle qty; recompute Virtual bundle stock |
| **Shipped/Delivered** | Decrement Reserved (open); recompute Virtual |
| **Cancelled (pre-ship)** | Decrement Reserved (open); recompute Virtual |
| **Admin edits Bundle Cap** | Save and recompute Virtual |

**Optional:** "Auto-cap from components" toggle if you ever want the cap to mirror children; off by default

---

## Admin (Back Office) Presentation

### Order List
- Add a **"Contains bundle" filter** and a small badge in rows

### Order Detail
- For each bundle group, show a **bundle header** with:
  - Shell name/SKU
  - Bundle qty
  - Bundle total (sum of its children)
- Under it, show the **component child rows** (staff-only: SKU, qty, allocated unit price, tax)
- Keep the standard totals panel (driven by child lines)
- **Quick links to the shell** (to view Cap / Reserved / Virtual)

### Shell Edit Page
- Fields:
  - **Bundle Cap** (editable)
  - **Reserved (open)** (read-only)
  - **Virtual bundle stock** (read-only)
  - Optional **Auto-cap toggle**
- If `Cap < Reserved`, show a warning and clamp Virtual to 0

---

## Returns, Partials, and Compliance

- Partial shipment/return acts on child lines
- Bundle header shows status chips ("Partially shipped/returned")
- If a market requires line-item pricing, you can reveal child prices in admin only; shopper UIs keep bundle cards with no component prices

---

## Metrics & Reporting

- **Revenue, margin, tax**: from child lines → accurate per-SKU analytics
- **Bundle sales**: count via Bundles summary (or bundleGroupId) and sum the grouped child revenue
- **Stock dashboards**: read shell's Cap, Reserved, and Virtual to understand sellable capacity and pipeline reservations

---

## Implementation Phases

### ✅ Phase 0: Planning & Documentation
**Status:** COMPLETED  
**Completed:** 2025-11-11

- [x] Analyzed existing v2 implementation
- [x] Identified what already works (bundleKey, bundleCap, order structure)
- [x] Defined minimal v3 additions (Reserved/Virtual stock tracking)
- [x] Revised implementation phases

---

### ⚠️ Phase 1: Add Reserved/Virtual Stock to Bundle Entity
**Status:** COMPLETED WITH CRITICAL BUG  
**Started:** 2025-11-11  
**Completed:** 2025-11-11  
**Critical Issue Found:** 2025-11-13 - Shell product being added as order line (violates architecture)

**What Already Exists:**
- ✅ `bundleCap` field on Bundle entity
- ✅ `bundleKey` for grouping order lines (no need for bundleGroupId)
- ✅ All order metadata fields (bundleId, bundleName, bundleVersion, etc.)
- ✅ Bundle display logic in CartDrawer and Cart page

**What Was Added:**
#### Tasks:
- [x] Add `bundleReservedOpen` field to Bundle entity (int, default 0)
- [x] Add `bundleVirtualStock` computed getter: `max(0, bundleCap - bundleReservedOpen)`
- [x] Update `getBundleAvailability()` to use Virtual stock when bundleCap is set
- [x] Generate migration (1762868851481-add-bundle-reserved-open.ts)
- [x] Update GraphQL schema to expose new fields (Shop + Admin API)

#### Acceptance Criteria:
- [x] Migration runs successfully
- [x] `bundleReservedOpen` persists correctly (column added with default 0)
- [x] `bundleVirtualStock` computes correctly (returns null if no cap, otherwise cap - reserved)
- [x] Availability logic considers Virtual stock (line 693 in bundle.service.ts)
- [x] No breaking changes to existing v2 functionality

#### Files Modified:
- `entities/bundle.entity.ts` - Added bundleReservedOpen field and bundleVirtualStock getter
- `services/bundle.service.ts` - Updated getBundleAvailability() to use bundleVirtualStock
- `bundle.plugin.ts` - Added fields to GraphQL schema (Shop + Admin API)
- `migrations/1762868851481-add-bundle-reserved-open.ts` - Migration file

---

## 🚨 CRITICAL ISSUE FOUND (2025-11-13)

**Problem:** Shell product is being added to orders as a "header line" in `bundle-v3.resolver.ts` lines 151-170.

**Impact:**
- ❌ Shell product appears as real order line (violates architecture)
- ❌ Shell stock gets reserved by Vendure
- ❌ Extra line item in orders (confusing reporting)
- ❌ Duplicates bundle information (header + children both have bundle data)

**Root Cause:**
```typescript
// bundle-v3.resolver.ts lines 151-159
await this.orderService.addItemToOrder(
    ctx, 
    activeOrder.id, 
    result.headerLine.productVariantId!, // <- Shell being added!
    result.headerLine.quantity!, 
    result.headerLine.customFields
);
```

**Fix Required:**
1. Remove header line addition from resolver
2. Ensure all bundle metadata is on child lines only
3. UI must reconstruct bundle from child line metadata (bundleKey)
4. Shell product used only for: SEO, images, capacity tracking (never in order)

**Status:** BLOCKING - Must fix before proceeding with Phase 4+

---

### ✅ Phase 2: Order State Event Subscribers
**Status:** COMPLETED  
**Started:** 2025-11-11  
**Completed:** 2025-11-11

#### Tasks:
- [x] Create `BundleReservationService` with methods:
  - `incrementReserved(bundleId, qty)` - Increment Reserved counter
  - `decrementReserved(bundleId, qty)` - Decrement Reserved counter
  - `syncReservedCounts(bundleId)` - Recalculate from orders (for consistency)
  - `getReservationStatus(bundleId)` - Get current reservation status
- [x] Update `BundleOrderService` to listen to `OrderStateTransitionEvent`:
  - On transition to "PaymentSettled" → increment Reserved
  - On transition to "Shipped" or "Delivered" → decrement Reserved
  - On transition to "Cancelled" (from PaymentSettled) → decrement Reserved
- [x] Add helper `updateBundleReservations()` to handle state transitions
- [x] Add helper `getBundleQuantityFromGroup()` to extract bundle quantity from order lines
- [x] Register BundleReservationService in plugin providers

#### Acceptance Criteria:
- [x] Event subscriber registers correctly (existing BundleOrderService.onModuleInit)
- [x] Reserved increments when payment settled
- [x] Reserved decrements when shipped/cancelled
- [x] Virtual stock updates reflect Reserved changes (computed property)
- [x] Logging in place for all reservation changes
- [x] No breaking changes to existing functionality

#### Files Created/Modified:
- `services/bundle-reservation.service.ts` - New service (233 lines)
- `services/bundle-order.service.ts` - Added reservation tracking
- `bundle.plugin.ts` - Registered new service

#### How It Works:
When an order containing bundles transitions states:
1. `BundleOrderService` detects the transition via `OrderStateTransitionEvent`
2. Calls `updateBundleReservations()` to determine action
3. Calls `BundleReservationService.incrementReserved()` or `decrementReserved()`
4. Service updates `bundleReservedOpen` in database
5. `bundleVirtualStock` getter automatically recalculates
6. Next availability check uses updated Virtual stock

---

### ✅ Phase 3: Admin UI - Bundle Edit Page (Reserved/Virtual Display)
**Status:** COMPLETED  
**Started:** 2025-11-11  
**Completed:** 2025-11-11

#### Tasks:
- [x] Update GET_BUNDLE GraphQL query to include bundleReservedOpen and bundleVirtualStock
- [x] Add Reserved (Open) display field in Availability section (read-only)
- [x] Add Virtual Stock display field in Availability section (read-only, computed)
- [x] Add color coding: green (available), warning (0), danger (overbooked)
- [x] Add "OVERBOOKED" warning badge when Cap < Reserved
- [x] Add isOverbooked() method to check overbooked status
- [x] Show fields only when bundleCap is set (conditional display)

#### Acceptance Criteria:
- [x] Reserved count displays correctly (read-only)
- [x] Virtual stock displays correctly (computed, read-only)
- [x] Warning shows when Cap < Reserved (⚠️ OVERBOOKED)
- [x] Fields only visible when bundle has a cap
- [x] Color coding works (success/warning/danger)
- [x] UI updates when bundle is reloaded after order state changes

#### Files Modified:
- `ui/bundle-detail.component.ts`:
  - Updated GET_BUNDLE query (lines 48-49)
  - Added isOverbooked() method
- `ui/bundle-detail.component.html`:
  - Added Reserved (Open) field (lines 198-207)
  - Added Virtual Stock field with color coding (lines 209-228)
  - Added overbooked warning badge

#### How It Looks:
```
Availability Section:
┌─────────────────────────────────────┐
│ Available from: [date picker]       │
│ Available until: [date picker]      │
│ Bundle cap: [100]                   │
│ Reserved (Open): 25 (read-only)     │
│ Virtual Stock: 75 (computed)        │
└─────────────────────────────────────┘

When Overbooked (Reserved > Cap):
┌─────────────────────────────────────┐
│ Bundle cap: [100]                   │
│ Reserved (Open): 120 (read-only)    │
│ Virtual Stock: 0 ⚠️ OVERBOOKED     │
└─────────────────────────────────────┘
```

---

### 📋 Phase 4: Admin UI - Order Detail View (Bundle Grouping)
**Status:** PENDING  
**Started:** -  
**Completed:** -

**Note:** This reuses existing `bundleKey` for grouping

#### Tasks:
- [ ] Create helper service: `getBundleSummaryFromOrder(order)`:
  - Groups OrderLines by `bundleKey`
  - Extracts bundle metadata (bundleId, bundleName, bundleVersion)
  - Calculates bundle totals from child lines
  - Returns array of bundle summaries
- [ ] Update Order Detail UI to display bundle groups:
  - Bundle header card (name, qty, total)
  - Child components list (no prices shown)
  - Collapse/expand functionality
- [ ] Add "Bundle" badge to order list for orders with bundles

#### Acceptance Criteria:
- [ ] Bundle orders display with grouped cards
- [ ] Component details visible to admin
- [ ] Badge shows on order list
- [ ] Grouping logic works for multiple bundles in one order

---

### 📋 Phase 5: Storefront - Reusable Bundle Card Component
**Status:** PENDING  
**Started:** -  
**Completed:** -

**Note:** Extract and enhance existing CartDrawer bundle display logic

#### Tasks:
- [ ] Extract bundle display logic from CartDrawer into `<BundleCard>`:
  - Bundle name, image, price
  - Component list (names + qty only, no prices)
  - Quantity display
  - Total price display
- [ ] Make component reusable across:
  - Cart drawer (already working)
  - Cart page (already working)
  - Checkout page (new)
  - Thank you page (new)
  - Order history (new)
- [ ] Add props for different contexts (editable qty vs read-only)

#### Acceptance Criteria:
- [ ] Component works in all contexts
- [ ] No component prices visible to customers
- [ ] Responsive design
- [ ] Matches existing cart display style

---

### 📋 Phase 6: Storefront - Checkout, Thank You, Orders Pages
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] **Checkout page:**
  - Replace order line list with BundleCard for bundles
  - Keep regular items as-is
  - Show bundle totals correctly
- [ ] **Thank you page:**
  - Display bundles using BundleCard
  - Show order summary with bundle grouping
- [ ] **My Orders page:**
  - List orders with bundle indicators
  - Order detail view uses BundleCard
  - Show shipping status per bundle

#### Acceptance Criteria:
- [ ] All pages display bundles consistently
- [ ] No component prices visible
- [ ] Totals match across all pages
- [ ] Mobile responsive

---

### 📋 Phase 7: Email Templates (Bundle Cards)
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Update order confirmation email:
  - Show bundle as single line item
  - List components underneath (no prices)
  - Keep existing email styling
- [ ] Update shipping confirmation email:
  - Same bundle card format
- [ ] Test email rendering in major clients (Gmail, Outlook, etc.)

#### Acceptance Criteria:
- [ ] Emails show bundles correctly
- [ ] No component prices shown
- [ ] Renders correctly in all tested clients

---

### 📋 Phase 8: Returns & Partial Shipments (Reserved Updates)
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Update Reserved counter on partial shipments:
  - When partial bundle shipped → no change to Reserved
  - When full bundle shipped → decrement Reserved
- [ ] Update Reserved counter on returns:
  - When bundle returned → increment Reserved (back to available)
- [ ] Add status chips to bundle display:
  - "Partially shipped", "Shipped", "Returned", etc.
- [ ] Test edge cases (partial returns, mixed states)

#### Acceptance Criteria:
- [ ] Reserved updates correctly for all states
- [ ] Status chips display correctly
- [ ] Virtual stock reflects returns

---

### 📋 Phase 9: Testing & QA
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] End-to-end test: Bundle purchase → payment → shipment → Reserved updates
- [ ] Test concurrent orders (race conditions on Reserved)
- [ ] Test cap enforcement (can't buy more than Virtual stock)
- [ ] Test bundle display across all UIs
- [ ] Cross-browser testing
- [ ] Mobile testing

#### Acceptance Criteria:
- [ ] All E2E tests pass
- [ ] No race conditions in Reserved updates
- [ ] Cap enforcement works correctly
- [ ] UI consistent across browsers/devices

---

### 📋 Phase 10: Documentation & Deployment
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Write user documentation
- [ ] Write admin documentation
- [ ] Create deployment runbook
- [ ] Prepare rollback plan
- [ ] Create training materials
- [ ] Deploy to staging
- [ ] Deploy to production

#### Acceptance Criteria:
- [ ] Documentation complete
- [ ] Deployment successful
- [ ] Team trained
- [ ] Monitoring in place

---

## Git Workflow

After each phase completion:
1. Update this document with completion date and status
2. Commit changes with message: `feat: Complete Phase X - [Phase Name]`
3. Push to remote repository
4. Create PR if using feature branch workflow

## Notes

- Shell for visibility & capacity
- Children for accounting
- One coherent bundle card UI end-to-end
- Simple state-driven counters to keep availability correct
