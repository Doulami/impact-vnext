# Bundle Implementation Plan

**Last Updated:** 2025-11-11  
**Status:** Planning Complete - Ready for Implementation

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
- **Shell is never an order line**

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

- [x] Document goals and requirements
- [x] Define core model
- [x] Plan implementation phases

---

### 📋 Phase 1: Database Schema & Core Models
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Add shell fields to ProductVariant entity:
  - `bundleCap` (integer, nullable)
  - `bundleReservedOpen` (integer, default 0)
  - `bundleVirtualStock` (integer, computed)
  - `bundleAutoCap` (boolean, default false)
- [ ] Add Order fields:
  - `bundlesSummary` (JSON field)
- [ ] Add OrderLine fields:
  - `bundleGroupId` (string, nullable)
  - `bundleAllocatedPrice` (integer, nullable - for internal tracking)
- [ ] Create migration scripts
- [ ] Update TypeScript types/interfaces

#### Acceptance Criteria:
- [ ] Migration runs successfully
- [ ] New fields accessible in models
- [ ] No breaking changes to existing functionality

---

### 📋 Phase 2: Backend - Bundle Stock Management
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Create `BundleStockService` with methods:
  - `computeVirtualStock(shellVariantId)`
  - `incrementReserved(shellVariantId, qty)`
  - `decrementReserved(shellVariantId, qty)`
  - `updateBundleCap(shellVariantId, newCap)`
- [ ] Add validation logic (warn if Cap < Reserved)
- [ ] Create event handlers for order state transitions:
  - Payment Settled → increment Reserved
  - Shipped/Delivered → decrement Reserved
  - Cancelled → decrement Reserved
- [ ] Update inventory queries to use Virtual stock for shells
- [ ] Add unit tests for stock calculations

#### Acceptance Criteria:
- [ ] Virtual stock computed correctly
- [ ] Order state changes update Reserved correctly
- [ ] Tests pass with 80%+ coverage

---

### 📋 Phase 3: Backend - Order Processing & Price Allocation
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Update cart/checkout logic:
  - When bundle added, create child order lines only
  - Allocate bundle discount across children
  - Implement percentage detection for fixed-price bundles
- [ ] Store bundles summary on Order:
  - Shell variant ID
  - Quantity
  - Display name/price
  - Components list
- [ ] Assign bundleGroupId to child order lines
- [ ] Ensure shell never becomes an order line
- [ ] Add integration tests for order creation

#### Acceptance Criteria:
- [ ] Orders contain only child variants
- [ ] Price allocation sums to bundle total
- [ ] Bundles summary stored correctly
- [ ] Integration tests pass

---

### 📋 Phase 4: Admin UI - Order List & Filtering
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Add "Contains bundle" filter to order list
- [ ] Add bundle badge to order rows
- [ ] Update order list query to detect bundle orders
- [ ] Style badge and filter UI

#### Acceptance Criteria:
- [ ] Filter shows only bundle orders
- [ ] Badge visible on bundle orders
- [ ] UI matches design system

---

### 📋 Phase 5: Admin UI - Order Detail View
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Group order lines by bundleGroupId
- [ ] Create bundle header component showing:
  - Shell name/SKU
  - Bundle qty
  - Bundle total
- [ ] Show child components under header with:
  - SKU
  - Qty
  - Allocated unit price
  - Tax
- [ ] Add quick links to shell product
- [ ] Add status chips for partial shipment/return
- [ ] Keep standard totals panel

#### Acceptance Criteria:
- [ ] Bundle orders display grouped correctly
- [ ] All information visible to staff
- [ ] Links work correctly
- [ ] Status chips update with order state

---

### 📋 Phase 6: Admin UI - Shell Edit Page
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Add Bundle Stock section to shell variant edit page:
  - Bundle Cap (editable input)
  - Reserved (read-only)
  - Virtual Stock (read-only, computed)
  - Auto-cap toggle (optional)
- [ ] Add validation/warning when Cap < Reserved
- [ ] Wire up to BundleStockService
- [ ] Add save handler for Bundle Cap updates

#### Acceptance Criteria:
- [ ] Fields display correctly
- [ ] Cap updates trigger Virtual stock recalculation
- [ ] Warning shows when Cap < Reserved
- [ ] Changes persist correctly

---

### 📋 Phase 7: Storefront - Bundle Card Component
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Create reusable BundleCard component showing:
  - Bundle name
  - Bundle price
  - Bundle quantity
  - Component list (names + qty only, no prices)
- [ ] Style to match existing cart display
- [ ] Ensure totals match bundle price
- [ ] Add responsive design

#### Acceptance Criteria:
- [ ] Component renders correctly
- [ ] No component prices visible
- [ ] Matches design specifications
- [ ] Works on mobile and desktop

---

### 📋 Phase 8: Storefront - Checkout & Thank You Pages
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Integrate BundleCard into checkout page
- [ ] Integrate BundleCard into thank you page
- [ ] Update order summary to use bundle cards
- [ ] Test checkout flow end-to-end

#### Acceptance Criteria:
- [ ] Bundle cards display in checkout
- [ ] Bundle cards display on thank you page
- [ ] Order totals correct
- [ ] End-to-end flow works

---

### 📋 Phase 9: Storefront - My Orders Page
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Integrate BundleCard into order history
- [ ] Show bundle status (shipped, partial, etc.)
- [ ] Update order detail view
- [ ] Add reorder functionality (if applicable)

#### Acceptance Criteria:
- [ ] Order history shows bundle cards
- [ ] Status updates display correctly
- [ ] Detail view works
- [ ] Reorder works (if implemented)

---

### 📋 Phase 10: Email Templates & Invoices
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Update order confirmation email template
- [ ] Update shipping confirmation email template
- [ ] Update invoice template
- [ ] Show single bundle line with component sublist
- [ ] Ensure no component prices visible

#### Acceptance Criteria:
- [ ] Emails display bundles correctly
- [ ] Invoice format correct
- [ ] No component prices shown
- [ ] Test emails render in major clients

---

### 📋 Phase 11: Returns & Partial Shipments
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Update return flow to handle child lines
- [ ] Update partial shipment logic
- [ ] Add status chips to bundle headers
- [ ] Update Reserved counters on returns
- [ ] Test various partial scenarios

#### Acceptance Criteria:
- [ ] Returns work on individual components
- [ ] Partial shipments tracked correctly
- [ ] Status chips display correctly
- [ ] Reserved counters update properly

---

### 📋 Phase 12: Reporting & Analytics
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] Create bundle sales report
- [ ] Update revenue reports to include bundle data
- [ ] Create stock dashboard for bundles
- [ ] Add bundle metrics to admin dashboard
- [ ] Test reports with sample data

#### Acceptance Criteria:
- [ ] Reports show accurate bundle sales
- [ ] Revenue attributed correctly to child SKUs
- [ ] Stock dashboard functional
- [ ] Metrics update in real-time

---

### 📋 Phase 13: Testing & QA
**Status:** PENDING  
**Started:** -  
**Completed:** -

#### Tasks:
- [ ] End-to-end testing of full bundle lifecycle
- [ ] Load testing for stock calculations
- [ ] Edge case testing (cancelled orders, returns, etc.)
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Performance testing
- [ ] Security review

#### Acceptance Criteria:
- [ ] All E2E tests pass
- [ ] Performance meets requirements
- [ ] No critical bugs
- [ ] Security approved

---

### 📋 Phase 14: Documentation & Deployment
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
