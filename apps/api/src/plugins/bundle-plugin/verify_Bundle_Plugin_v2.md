# Warp TODO — Bundle Plugin v2 (Vendure 3.5 • Angular Admin • Exploded Bundles)

## Objective
Implement & harden **Exploded Bundles**: a bundle is managed by a plugin entity and, at runtime, is added to cart/orders as:
- One **visible header line** (cosmetic, price `0`)
- Multiple **hidden child OrderLines** (real `ProductVariant`s, discounted)

**Invariant:** Stock & revenue are tracked **only** on child variants. The header and (optional) shell product never affect inventory or revenue.

---

## 0) Current State (from project)
- Entities & DB: `Bundle` + `BundleItem` exist ✅
- Shop API: `bundle`, `bundles` queries ✅
- Front-end: PLP/PDP + cart “Exploded Bundles” ✅
- Backend mutations implemented per user: `addBundleToOrder`, `adjustBundleInOrder`, `removeBundleFromOrder` ✅
- **Now harden promotions, safety/guards, admin UX, indexing, metrics, CI.**

---

## 1) Data Model (verify / enforce)

**BundleDefinition**
- `id`, `name`, `slug`, `description`
- `status`: `DRAFT | ACTIVE | BROKEN | ARCHIVED`
- `discountType`: `fixed | percent`
- `fixedPrice?` (cents), `percentOff?` (0..100)
- `version` (int; increments on publish)
- `assets[]`, `tags[]`, `category`
- `items: BundleItem[]`
- timestamps

**BundleItem**
- `id`
- `variant: ProductVariant` — **ON DELETE RESTRICT**
- `quantity: int` (per 1 bundle)
- `weight?: float` (optional; for fixed-price proration)
- `displayOrder: int`
- `unitPriceSnapshot?: int` (optional)

**Optional Product Shell (recommended for SEO/PLP)**
- `Product.customFields.isBundle: boolean`
- `Product.customFields.bundleId: ID | null`
- Single shell variant: `trackInventory=false` (never decremented)

**OrderLine.customFields** (child lines only)
- `bundleKey: string` (UUID per bundle instance)
- `bundleId: string`, `bundleName: string`, `bundleVersion: int`
- `bundleComponentQty: int`
- `baseUnitPrice: int`, `effectiveUnitPrice: int`
- `bundlePctApplied: float`, `bundleAdjAmount: int`
- `bundleShare?: float`
- `isBundleHeader?: boolean` (true only on cosmetic header line)

---

## 2) Availability
- Component reality: `A_components = min( floor(available_i / quantity_i) )`
- Optional shell cap (marketing gate): `A_shell = bundleCap` (shell never decremented)
- PDP/PLP show: `A_final = min(A_components, A_shell)` if `status=ACTIVE`
- Checkout: enforce component availability; reject if any child cannot fulfill

---

## 3) Pricing (per add/adjust)
Let `B` = bundle qty; for component `i` with `q_i`, unit `p_i`:
- `S_i = p_i * (q_i * B)`
- `S = Σ S_i`

**Percent**
- `bundlePct = percentOff / 100`
- `D = round(S * bundlePct)`
- Child: `adj_i = -round(S_i * bundlePct)`
- `effectiveUnitPrice = round(p_i*(1-bundlePct))`
- Store `bundlePctApplied = bundlePct*100`

**Fixed**
- `bundlePriceTotal = fixedPrice * B`
- `D = S - bundlePriceTotal`
- Proration: `share_i = S_i/S` (or weights / equal)
- `adj_i = -round(D * share_i)`; fix rounding drift on max `S_i` so `Σ adj_i == -D`
- `linePct = (-adj_i)/S_i`; `effectiveUnitPrice = round(p_i*(1-linePct))`
- Store both `adj_i` and `linePct*100`

**Assert:** `Σ adj_i == -D` per group; log error metric if violated.

---

## 4) API (confirm behavior)
- `addBundleToOrder(bundleId: ID!, quantity: Int!)`
- `adjustBundleInOrder(bundleKey: String!, quantity: Int!)`
- `removeBundleFromOrder(bundleKey: String!)`

Header line: `isBundleHeader=true`, `unitPrice=0`, grouped by `bundleKey`  
Children: real lines with snapshots above

---

## 5) Promotions — REQUIRED

### 5.1 Dedicated Bundle Pricing Promotion
- **Action:** `ApplyBundleLineAdjustments`
  - For each non-header line with `bundleKey != null`, read `bundleAdjAmount` (and `%`) from customFields and emit a **line adjustment**.
  - Tag description/source: `Bundle: <bundleName>` / `BUNDLE_PRICING`
  - **Do not recompute**; only replay stored snapshots.

- **Condition:** `HasBundleLines`
  - Activates when order contains lines with `bundleKey != null`.

### 5.2 Global Guard for All Other Promotions
- **Plugin setting:** `siteWidePromosAffectBundles`: `'Exclude' | 'Allow'` (default: `Exclude`)
- **Per-promotion override:** `'inherit' | 'never' | 'always'`
- **Per-bundle override (BundleDefinition):** `allowExternalPromos: 'inherit' | 'no' | 'yes'`
- **Optional cap:** `maxCumulativeDiscountPctForBundleChildren` (e.g., 40%)

- **Guard condition** used by every non-bundle promo:
  - If target line has `bundleKey != null`:
    - `effectiveAllow = promoSetting AND bundleAllow AND globalSetting`
    - If false → **skip line**
    - If true → allow stacking as a **separate** adjustment (does not alter `BUNDLE_PRICING`)

---

## 6) Safety & Deletion

- DB: enforce `BundleItem → ProductVariant` **ON DELETE RESTRICT**
- Event subscribers:
  - `ProductVariantUpdated` (price/stock) → enqueue Recompute+Reindex for bundles that contain it
  - `ProductVariantArchived` → mark related bundles `BROKEN`, disable Add-to-Cart, enqueue reindex
  - On attempted `ProductVariantDeleted` → block (RESTRICT) with actionable error

- Bundle lifecycle: `DRAFT → ACTIVE → BROKEN/ARCHIVED` (publish bumps `version`)
- **Managed delete** for shell product (if used):
  - Warn → unlink shell↔bundle → archive bundle (if ACTIVE) → reindex
  - Hard-delete bundle only if **never used** in any order

---

## 7) Angular Admin (UI/UX)

**Bundle Editor (plugin area)**
- Form: `name`, `slug`, `description`, `discountType`, `fixedPrice/percentOff`, `items[] (variant+qty+weight)`
- Component health panel: stock / archived / missing flags
- Preview: computed `bundlePrice`, `savings%`, `A_final` per channel
- Publish flow: validate → set `ACTIVE` → `version++`

**Bundle Item → Product Shell inheritance (UI-only)**
- In each `BundleItem` row, show **read-only** Product shell fields: title, slug, images, SEO meta, facets, collections, visibility
- Provide **“Edit Product”** deep-link button to the Product edit screen
- Editing occurs on Product screen; Bundle editor **reflects** those fields (no duplication)

**Product Variant detail (core admin)**
- Panel “Used in Bundles: N” with list + links
- Disable **Delete**; expose **Archive** and **Replace in Bundles** actions

**Replace in Bundles wizard**
- Batch-replace a retired variant across selected bundles → bump `version`, recompute, reindex, audit log

**Promotion Policy UI**
- Plugin Settings → Bundles:
  - “Site-wide promotions apply to bundle items?” → `Exclude / Allow (stack)`
  - If `Allow`: “Max cumulative discount on bundle items (%)”
- Promotion editor (non-bundle promos):
  - “Apply to bundle items?” → `Inherit global / Never / Always`
- Bundle editor (per bundle):
  - “Allow site-wide promos on this bundle?” → `Inherit global / No / Yes`

---

## 8) Search & Indexing (if Product shell is used)
Index fields on shell Product:
- `isBundle: true`
- `bundleId`
- `bundlePrice` (computed)
- `bundleAvailability = A_final`
- `bundleFacet: "Bundle"`
- Optional: `bundleComponents: [{variantId, qty}]`

Triggers to (re)index shell:
- BundleDefinition change (items/discount/status)
- Component variant price/stock change
- Channel price list change

---

## 9) Jobs & Nightly Consistency
- `RecomputeBundle(bundleId)` → recompute `bundlePrice`, `A_components`, `A_final`
- `ReindexBundleProduct(productId)` → update index fields
- Nightly consistency:
  - Scan bundles; flip to `BROKEN` if needed; reindex; notify admins

---

## 10) Metrics, Logs, Alerts

**Counters/Gauges**
- `bundle_add_requests_total`, `bundle_add_errors_total`
- `bundle_adjust_requests_total`, `bundle_adjust_errors_total`
- `bundle_remove_requests_total`, `bundle_remove_errors_total`
- `bundle_rounding_drift_total`
- `bundle_double_discount_total`
- `bundle_broken_total`

**Histograms (p95 latency)**
- `addBundleToOrder_duration_ms`
- `adjustBundleInOrder_duration_ms`
- `removeBundleFromOrder_duration_ms`

**Structured events** (include `bundleKey`, `bundleId`, `orderCode`)
- `bundle.added`, `bundle.adjusted`, `bundle.removed`
- `bundle.pricing.applied` (Σ adj, D, drift flag)
- `bundle.stock.violation`
- `bundle.promo.double_discount_detected`
- `bundle.status.broken`
- `bundle.reindex.queued` / `bundle.reindex.completed`

Expose `/metrics` endpoint for scraping and create a Grafana dashboard.

---

## 11) SQL/Diagnostics Snippets (admin scripts)

**Missing snapshots** 

SELECT COUNT(*) AS bad_lines
FROM order_line ol
WHERE (ol.custom_fields->>'bundleKey') IS NOT NULL
  AND (
    ol.custom_fields->>'baseUnitPrice' IS NULL OR
    ol.custom_fields->>'effectiveUnitPrice' IS NULL OR
    ol.custom_fields->>'bundleAdjAmount' IS NULL
  );

**Double discount (if guard not yet wired)* 

SELECT COUNT(*) AS suspicious
FROM order_line_adjustment a
JOIN order_line ol ON a.order_line_id = ol.id
WHERE (ol.custom_fields->>'bundleKey') IS NOT NULL
  AND a.description NOT ILIKE '%BUNDLE_PRICING%';


**Rounding drift check (grouped)*

-- Expect Σ bundleAdjAmount per bundle group equals -D; adapt to your schema if needed.
SELECT ol.order_id,
       SUM(COALESCE((ol.custom_fields->>'bundleAdjAmount')::int,0)) AS total_bundle_adj
FROM order_line ol
WHERE (ol.custom_fields->>'bundleKey') IS NOT NULL
GROUP BY ol.order_id;

## 12) QA / CI Acceptance (GWT)

### Percent bundle
**Given** a bundle with 20% off and variants A,B  
**When** I add 3 bundles  
**Then** the order has a header + child lines for A,B; each child `bundlePctApplied = 20`; `Σ(adj_i) = -D`

### Fixed bundle (rounding)
**Given** a bundle with fixed price < sum(A,B)  
**When** I add 1 bundle  
**Then** child lines have prorated adjustments; remainder applied to largest `S_i`; `Σ(adj_i) = -D`

### Adjust qty
**Given** an order with `bundleKey = X`  
**When** I change quantity `2 → 5 → 0`  
**Then** child quantities & snapshots update accordingly; group is removed at `0`

### Mixed tax
**Given** children are in different tax categories  
**When** I add the bundle  
**Then** tax totals are correct (discount applied pre-tax per line)

### Insufficient stock
**Given** one child has insufficient stock  
**When** I add the bundle  
**Then** the mutation is rejected with a clear availability error

### Multi-channel / currency
**Given** multiple channels/currencies  
**When** I switch channel/currency and add the bundle  
**Then** computed price/availability are correct; snapshots stored per channel/currency

### Partial refund
**Given** an order containing a bundle  
**When** I refund a single child line  
**Then** refund equals that line’s actual paid (after all adjustments) and uses that line’s tax category

### Promo guard (Exclude)
**Given** global promo policy = `Exclude` and a site-wide `-10%` promotion  
**When** I add a bundle and a standalone SKU  
**Then** the standalone SKU gets `-10%`; bundle children only show `BUNDLE_PRICING` adjustments

### Promo stacking (Allow + cap)
**Given** global promo policy = `Allow` and cap = `40%`  
**When** combined discounts on a bundle child exceed `40%`  
**Then** the total discount for that child line is clamped at `40%`

### Archive component
**Given** a variant used by an `ACTIVE` bundle  
**When** I archive that variant  
**Then** the bundle becomes `BROKEN`, Add-to-Cart is disabled, and reindex is queued

### Delete component
**Given** a variant used by an `ACTIVE` bundle  
**When** I attempt to delete that variant  
**Then** the operation is blocked (`ON DELETE RESTRICT`) with a meaningful error

### Admin links
**Given** the Bundle editor  
**When** I view a BundleItem row  
**Then** read-only Product shell fields are displayed and an **Edit Product** deep-link opens the Product edit page


## 13) Deliverables Checklist

- [ ] Bundle promo action **`ApplyBundleLineAdjustments`** + condition **`HasBundleLines`**
- [ ] Global/promo/bundle toggles for site-wide promos (+ optional cap); guard applied to **all non-bundle promotions**
- [ ] Enforce **RESTRICT** on **`BundleItem → ProductVariant`**
- [ ] Event subscribers + recompute/reindex jobs + nightly consistency scan
- [ ] Admin UI: Bundle editor, Bundle Item → Product shell summary + **Edit Product** deep-link
- [ ] Admin UI: Variant “Used in Bundles” panel + **Replace-in-Bundles** wizard
- [ ] (Optional) Product shell + search indexing fields (if shell is used)
- [ ] Metrics endpoint **`/metrics`**, structured events, Grafana dashboard
- [ ] CI tests implementing §12 (all GWT scenarios above)


## 14) Success Metrics (alerts / SLOs)

### Functional
- Add-to-cart success (bundles) **≥ 99.5%**
- Rounding drift violations **= 0** (assert `Σ(adj_i) = -D`)
- Stock variance (child-only) **= 0**
- Refund accuracy **= 100%** (uses child actual paid)

### Promos
- Double-discount incidents on bundle lines **= 0** (unless stacking enabled)
- Bundle-pricing replay coverage **= 100%** (`BUNDLE_PRICING` present on bundle child lines)

### Performance (p95)
- `addBundleToOrder` **≤ 150 ms**
- `adjustBundleInOrder` **≤ 120 ms**
- `removeBundleFromOrder` **≤ 100 ms**

### Ops
- BROKEN bundles steady-state **= 0**
- Reindex lag **< 60 s**
- Orders with missing snapshots **= 0**




