# Bundle Plugin v2 Implementation Task List

## Phase 1: Data Model & Core Infrastructure (Critical)

### 1.1 Database Schema Fixes
- [x] **Fix Bundle Entity** - Add missing fields: `status`, `discountType`, `fixedPrice`, `percentOff`, `version`
- [x] **Add RESTRICT Constraint** - Enforce `ON DELETE RESTRICT` for BundleItem → ProductVariant
- [x] **Generate Migration** - Create proper migration for schema changes
- [x] **Product Shell Support** - Add `isBundle`, `bundleId` customFields to Product entity

### 1.2 Bundle Entity Enhancements
- [x] **Status Enum** - Implement `DRAFT | ACTIVE | BROKEN | ARCHIVED` status system
- [x] **Discount Types** - Support both `fixed` and `percent` discount types
- [x] **Version Management** - Auto-increment version on bundle publish
- [x] **Validation** - Ensure either `fixedPrice` OR `percentOff` is set, not both

## Phase 2: Core Bundle Logic (Business Critical)

### 2.1 Availability System
- [x] **Component Availability** - `A_components = min(floor(available_i / quantity_i))`
- [x] **Shell Availability Gate** - Optional marketing cap via shell product
- [x] **Final Availability** - `A_final = min(A_components, A_shell)` for ACTIVE bundles
- [x] **Checkout Validation** - Reject if any component cannot fulfill

### 2.2 Pricing Engine (Complete Rewrite)
- [x] **Percent Discount Logic** - `bundlePct = percentOff/100`, proper rounding
- [x] **Fixed Price Logic** - Value-based proration with drift correction
- [x] **Rounding Drift Fix** - Ensure `Σ adj_i = -D` exactly, adjust largest subtotal
- [x] **Price Snapshots** - Store all pricing metadata in OrderLine customFields

### 2.3 Bundle Mutations (Fix Current Implementation)
- [x] **Fix Header Line** - Use proper shell product variant, not dummy first component
- [x] **addBundleToOrder** - Complete implementation with proper pricing/availability
- [x] **adjustBundleInOrder** - Handle quantity changes with pricing recalculation
- [x] **removeBundleFromOrder** - Clean removal of all bundle lines
- [x] **Error Handling** - Comprehensive error responses for all failure modes

## Phase 3: Promotions System (Business Critical)

### 3.1 Bundle Promotion Action
- [x] **ApplyBundleLineAdjustments** - Read `bundleAdjAmount` from customFields, emit adjustments
- [x] **HasBundleLines Condition** - Activate when order contains bundle lines
- [x] **Source Tagging** - Tag adjustments with `BUNDLE_PRICING` source
- [x] **No Recomputation** - Only replay stored snapshots

### 3.2 Promotion Guard System
- [ ] **Global Policy Setting** - `siteWidePromosAffectBundles: 'Exclude' | 'Allow'`
- [ ] **Per-Promotion Override** - `'inherit' | 'never' | 'always'`
- [ ] **Per-Bundle Override** - `allowExternalPromos: 'inherit' | 'no' | 'yes'`
- [ ] **Discount Cap** - Optional `maxCumulativeDiscountPctForBundleChildren`
- [ ] **Guard Implementation** - Apply to ALL non-bundle promotions

## Phase 4: Safety & Lifecycle Management

### 4.1 Database Safety
- [ ] **RESTRICT Constraint** - Block deletion of variants used in ACTIVE bundles
- [ ] **Event Subscribers** - Listen for ProductVariant updates/deletions/archival
- [ ] **Bundle Status Management** - Auto-mark bundles BROKEN when components archived
- [ ] **Cascade Handling** - Proper cleanup when shell products deleted

### 4.2 Job Queue System
- [ ] **RecomputeBundle Job** - Recalculate bundle price, availability when components change
- [ ] **ReindexBundleProduct Job** - Update search index when bundle changes
- [ ] **Nightly Consistency Job** - Scan/fix BROKEN bundles, notify admins
- [ ] **Job Triggers** - Wire up all events that should trigger recompute/reindex

## Phase 5: Admin UI Enhancements

### 5.1 Bundle Editor Improvements
- [ ] **Status Management UI** - DRAFT/ACTIVE/BROKEN/ARCHIVED workflow
- [ ] **Discount Type UI** - Switch between fixed price and percentage discount
- [ ] **Component Health Panel** - Show stock status, archived flags for each component
- [ ] **Bundle Preview** - Live calculation of bundle price, savings, availability
- [ ] **Publish Workflow** - Validate → set ACTIVE → increment version

### 5.2 Product Shell Integration
- [ ] **Shell Product Creation** - Auto-create shell products for SEO/PLP
- [ ] **Inherited Fields Display** - Show shell product fields in bundle editor (read-only)
- [ ] **Edit Product Deep-Link** - Button to edit shell product from bundle editor
- [ ] **Shell Management** - Handle shell creation, linking, unlinking

### 5.3 Variant Safety UI
- [ ] **"Used in Bundles" Panel** - Show on ProductVariant detail pages
- [ ] **Delete Prevention UI** - Disable delete button, show archive instead
- [ ] **Replace in Bundles Wizard** - Batch replace variant across bundles
- [ ] **Archive Workflow** - Mark bundles BROKEN when variant archived

### 5.4 Promotion Policy UI
- [ ] **Plugin Settings Page** - Global bundle promotion policy settings
- [ ] **Promotion Editor** - Per-promotion bundle policy overrides
- [ ] **Bundle Editor Policy** - Per-bundle external promotion settings
- [ ] **Policy Validation** - Ensure consistent policy configuration

## Phase 6: Search & Indexing (Optional but Recommended)

### 6.1 Search Integration
- [ ] **Bundle Index Fields** - `isBundle`, `bundleId`, `bundlePrice`, `bundleAvailability`
- [ ] **Index Triggers** - Reindex when bundle definition changes
- [ ] **Component Change Triggers** - Reindex when component prices/stock change
- [ ] **Search Query Support** - Filter/facet by bundle status in admin

## Phase 7: Monitoring & Metrics

### 7.1 Metrics System
- [ ] **Counter Metrics** - Track bundle operations (add/adjust/remove requests/errors)
- [ ] **Histogram Metrics** - Track operation latency (p95)
- [ ] **Business Metrics** - Rounding drift, double discount detection, broken bundles
- [ ] **Metrics Endpoint** - Expose `/metrics` for Prometheus scraping

### 7.2 Structured Events
- [ ] **Bundle Events** - `bundle.added`, `bundle.adjusted`, `bundle.removed`
- [ ] **Pricing Events** - `bundle.pricing.applied` with drift detection
- [ ] **Error Events** - `bundle.stock.violation`, `bundle.status.broken`
- [ ] **Ops Events** - `bundle.reindex.queued`, `bundle.reindex.completed`

## Phase 8: Testing & Quality Assurance

### 8.1 Unit Tests
- [ ] **Pricing Engine Tests** - Test all pricing scenarios with exact assertions
- [ ] **Availability Tests** - Component and shell availability calculations
- [ ] **Mutation Tests** - All GraphQL mutations with error cases
- [ ] **Event Subscriber Tests** - Verify proper event handling

### 8.2 Integration Tests
- [ ] **End-to-End Bundle Flow** - Add to cart → checkout → order completion
- [ ] **Promotion Integration** - Verify bundle promotions and guard system work
- [ ] **Admin Workflow Tests** - Bundle creation, editing, status management
- [ ] **Safety Tests** - Verify RESTRICT constraints and cascade handling

### 8.3 Acceptance Tests (from verification doc)
- [ ] **Percent Bundle Test** - 20% off bundle with proper adjustments
- [ ] **Fixed Bundle Test** - Fixed price with rounding correction
- [ ] **Quantity Adjustment Test** - Change qty 2→5→0
- [ ] **Mixed Tax Test** - Different tax categories on components
- [ ] **Stock Validation Test** - Insufficient component stock handling
- [ ] **Multi-Channel Test** - Different channels/currencies
- [ ] **Partial Refund Test** - Refund single component from bundle
- [ ] **Promotion Guard Test** - Site-wide promo exclusion/inclusion
- [ ] **Component Lifecycle Test** - Archive/delete component handling

## Implementation Notes

### Current Status Assessment
- ✅ **Phase 1 COMPLETE** - Database schema, entity enhancements, status lifecycle
- ✅ **Phase 2 COMPLETE** - Availability system, pricing engine, bundle mutations with GraphQL
- ❌ **Phase 3** - Promotions system (ApplyBundleLineAdjustments, guard system)
- ❌ **Phase 4** - Safety & lifecycle management (event subscribers, job queue)
- ❌ **Phase 5** - Admin UI enhancements
- ❌ **Phase 6-8** - Search, monitoring, testing

### Development Guidelines
1. **No dummy variables** - Every component must be fully implemented
2. **Complete each phase** - Don't move to next phase with incomplete work
3. **Test as you go** - Each feature must be tested before marking complete
4. **Document decisions** - Note any implementation choices or trade-offs
5. **Progressive testing** - Can test individual phases without waiting for full completion

### Dependencies
- **Phase 1 must complete first** - Database schema is foundation
- **Phase 2 before Phase 3** - Core logic before promotions
- **Phase 4 in parallel with 2-3** - Safety can be implemented alongside core logic
- **Phase 5 can be parallel** - Admin UI independent of core logic
- **Phase 6-8 at end** - Final polish and testing

---

**Ready to start with Phase 1.1: Database Schema Fixes**