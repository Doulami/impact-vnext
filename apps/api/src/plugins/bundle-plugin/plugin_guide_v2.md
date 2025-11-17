# Bundle System Spec (Vendure 3.5 • Angular Admin • Exploded Bundles)

**Goal**  
Implement a robust bundle system where a **bundle** is managed by a plugin entity and, at runtime, is added to the cart and orders as **Exploded Bundles**: one **visible parent group** with **hidden component children** (all children are real `ProductVariant` lines).

**Key Constraint**  
Stock & revenue are always tracked on **child variants only**. The visible parent (header) is for grouping/UI only.

---

## 0) Current State (from project)

- **Entities & DB:** `Bundle` + `BundleItem` in TypeORM with relations ✅  
- **Shop API:** `bundle`, `bundles` queries ✅  
- **Front-end:** listing, PDP, savings, cart grouping with Exploded Bundles ✅  
- **Gaps:** `addBundleToOrder`, `adjustBundleInOrder`, `removeBundleFromOrder` ⛔ (placeholders)

---

## 1) Terminology

- **BundleDefinition (`Bundle`)**: Plugin entity (source of truth). Holds composition & discount rule.  
- **BundleItem**: Links a bundle to a `ProductVariant` + required quantity.  
- **Exploded Bundle (runtime)**: In cart/orders, rendered as a group:
  - a single **visible group header** (0 price; cosmetic)
  - **hidden child OrderLines** (actual variants with discounts)  
- **Bundle Shell Product (optional but recommended)**: Normal Vendure `Product` used for PDP/PLP/SEO/Collections; it points to a `BundleDefinition`. It never carries stock or revenue.

---

## 2) Data Model

### 2.1 Entities

**BundleDefinition**
- `id: ID`
- `name: string`
- `slug: string`
- `description: string`
- `status: 'DRAFT' | 'ACTIVE' | 'BROKEN' | 'ARCHIVED'`
- `discountType: 'fixed' | 'percent'`
- `fixedPrice?: int (cents)`
- `percentOff?: number (0..100)`
- `version: int` (increment on publish)
- `assets: Asset[]`
- `tags: string[]`
- `category: string`
- `allowStacking?: boolean` (legacy toggle; see promos policy below)
- `items: BundleItem[]`
- `timestamps`

**BundleItem**
- `id: ID`
- `variant: ProductVariant` **(RESTRICT on delete)**
- `quantity: int` (per 1 bundle)
- `weight?: float` (optional; for fixed-price proration)
- `displayOrder: int`
- `unitPriceSnapshot?: int (cents)` (optional for audits)

> **Important:** Use **RESTRICT** on `BundleItem → ProductVariant` to block deletion if any referencing bundle is `ACTIVE`.

### 2.2 Optional Product customFields (if using a shell)
- `Product.customFields.isBundle: boolean`
- `Product.customFields.bundleId: ID | null`
- Single variant on the shell: `trackInventory=false` (never decremented).

---

## 3) OrderLine customFields (for Exploded Bundles)

Add to `OrderLine` (set whenever adding/adjusting the bundle):

- `bundleKey: string` — UUID per bundle instance  
- `bundleId: string` — `BundleDefinition.id`  
- `bundleName: string`  
- `bundleVersion: int`  
- `bundleComponentQty: int` — qty of this variant **per 1 bundle**  
- `baseUnitPrice: int` — unit price snapshot before bundle discount  
- `effectiveUnitPrice: int` — unit price after discount  
- `bundlePctApplied: float` — effective % applied to this line (0–100; 4 decimals)  
- `bundleAdjAmount: int` — **negative** total discount amount applied to this line (cents)  
- `bundleShare?: float` — share used for proration (6 decimals; optional)  
- `isBundleHeader?: boolean` — true only for the cosmetic group header line

---

## 4) Availability Logic

- **Component-derived availability (mandatory):**  
  `A_components = min( floor(available_i / quantity_i) )` across all `BundleItem`s.

- **Shell gate (optional marketing cap):**  
  `A_shell = bundleCap` (if exposed; otherwise ∞). The shell never decrements stock.

- **Final sellable qty on PDP/PLP:**  
  `A_final = min(A_components, A_shell)` (only if bundle `status=ACTIVE`).

- **At checkout:** only component availability matters. If any child can’t fulfill → reject add-to-cart.

---

## 5) Pricing & Discount Algorithm

Let `B` = number of bundles being purchased.  
For each component `i` with per-bundle qty `q_i` and unit price `p_i`:

- Pre-discount subtotal per component: `S_i = p_i * (q_i * B)`  
- Bundle total pre-discount: `S = Σ S_i`

### 5.1 Percent bundle
- `bundlePct = percentOff / 100`  
- `D = round(S * bundlePct)` (total discount)  
- Each child line:
  - `linePct = bundlePct`
  - `adj_i = - round(S_i * bundlePct)`
  - `effectiveUnitPrice = round(p_i * (1 - bundlePct))`

### 5.2 Fixed-price bundle
- `bundlePriceTotal = fixedPrice * B`  
- `D = S - bundlePriceTotal` (total discount)  
- Choose proration base:
  - default `share_i = S_i / S` (value-based)  
  - or `share_i = w_i / Σw` (weight-based)  
  - or equal split  
- Provisional: `adj_i* = - D * share_i`  
- Rounding: `adj_i = - round(D * share_i)`; fix drift by adjusting largest `S_i` so `Σ adj_i = -D`.  
- Effective % per line: `linePct = (-adj_i) / S_i`  
- `effectiveUnitPrice = round(p_i * (1 - linePct))`

**Store both** `adj_i` and `linePct` on the child lines.

---

## 6) Cart/Order Behavior — Exploded Bundles

- Cart/UI shows a **single visible group** (header line, `isBundleHeader=true`, price `0`) with expander to show/hide component children.
- **Only child lines** carry prices, taxes, discounts, and stock decrements.
- Grouping by `bundleKey` drives UI expansion and admin display.

---

## 7) API Surface (Shop API)

**Mutations (to implement):**
1. `addBundleToOrder(bundleId: ID!, quantity: Int!)`  
   - Validates availability (`A_final`).  
   - Computes discount/proration per §5.  
   - Adds/merges child lines with snapshots in customFields.  
   - Adds/updates 0-price header line (`isBundleHeader=true`) for the group.  
   - Returns updated order.

2. `adjustBundleInOrder(bundleKey: String!, quantity: Int!)`  
   - Recomputes and updates grouped child lines + header for the specified `bundleKey`.  
   - Handle `quantity=0` → remove group.

3. `removeBundleFromOrder(bundleKey: String!)`  
   - Removes all child lines with that `bundleKey` + its header.

**Queries (existing):**
- `bundle(id|slug)`
- `bundles(filter/pagination)`

**Optional Admin/Shop helpers:**
- `bundleDisplay(bundleId, channel)` → computed price, savings %, `A_final`, component grid (for PDP/PLP).  
- `bundleMaxQty(bundleId)` → `A_final`.

---

## 8) Promotion Integration (Bundle-Proof Policy)

**Dedicated bundle promotion (non-negotiable):**
- **Action:** `ApplyBundleLineAdjustments`  
  - Reads `bundleAdjAmount` (and `%`) from child lines’ customFields and returns **line adjustments**.  
  - Never recompute; prevents drift on recalculation.  
  - Tag adjustments with source `BUNDLE_PRICING`.

**Global policy switch (owner setting):**
- `siteWidePromosAffectBundles` = `Exclude` (default) | `Allow (stack)`  
  - If **Exclude**: non-bundle promotions **must skip** lines with `bundleKey != null`.  
  - If **Allow (stack)**: they **may also** apply to those lines (as **separate** adjustments).

**Overrides:**
- **Per-promotion override:** Inherit / Never / Always apply to bundle children.  
- **Per-bundle override:** `allowExternalPromos`: Inherit / No / Yes.

**Resolution:**  
For a non-bundle promotion & a line with `bundleKey != null` →  
`effectiveAllow = promoSetting AND bundleAllow AND globalSetting`.  
If false → skip the line. If true → stack as a separate adjustment.  
*(Optional cap: `maxCumulativeDiscountPctForBundleChildren`, e.g., 40%.)*

---

## 9) Returns & Refunds

- **Policy:** Proportional keep. Refunds use each child’s **actual paid** (base − all adjustments) and its tax category.  
- Partial returns do **not** reprice remaining items.

---

## 10) Safety & Deletion Rules

- **Variant safety:** `BundleItem → ProductVariant` is **RESTRICT** on delete.  
  - Delete attempts → blocked with actionable error.  
  - Archive → mark related bundles **BROKEN**, disable add-to-cart, enqueue reindex/recompute.

- **BundleDefinition lifecycle:** `DRAFT → ACTIVE → BROKEN/ARCHIVED`  
  - Publish increments `version`.  
  - `ARCHIVED` bundles are hidden but retained for audit if ever ordered.

- **Bundle Shell Product (if used): Managed delete**  
  - Deleting the shell shows warning → unlink shell↔bundle → archive bundle (if previously ACTIVE) → reindex.  
  - Hard-delete bundle only if **never used** in any order.

- **Shell inventory/reporting:** never tracked (`trackInventory=false`); exclude shell/header from sales reports.

---

## 11) Events & Jobs

**Event subscribers (backend):**
- On `ProductVariantUpdated` (price/stock): enqueue Recompute & Reindex for all bundles containing that variant.  
- On `ProductVariantArchived`: mark bundles **BROKEN**, disable Add-to-Cart, enqueue reindex.  
- On attempted `ProductVariantDeleted`: throw blocking error (RESTRICT).

**Jobs (queue):**
- `RecomputeBundle(bundleId)` → recompute `bundlePrice`, `A_components`, `A_final`.  
- `ReindexBundleProduct(productId)` → update search index fields:
  - `isBundle: true`
  - `bundleId`
  - `bundlePrice`
  - `bundleAvailability` (`A_final`)
  - `bundleFacet: "Bundle"`
  - optional `bundleComponents: [{variantId, qty}]`

**Nightly consistency job:** scan bundles, flag **BROKEN**, reindex, notify admins.

---

## 12) Angular Admin (UI/UX specifics)

**Bundle Editor (plugin section):**
- Form: `name`, `slug`, `description`, `discountType`, `fixedPrice/percentOff`, `items[] (variant+qty+weight)`.  
- Component health panel: stock, archived/missing flags.  
- Preview: computed `bundlePrice`, `savings%`, and `A_final` per channel.  
- Publish flow: validate → set `ACTIVE` → bump `version`.

**Bundle Item → Product Shell inheritance (UI-only):**
- In each `BundleItem` row, show a **read-only summary** of the related Product shell’s **title, slug, images, SEO meta, facets, collections, visibility**.  
- Provide an **“Edit Product”** button that deep-links to the Product shell’s edit screen.  
- Editing is **performed on the Product shell screen**; the Bundle editor **reflects** those fields (no duplication).

**Product Variant detail (core admin):**
- Panel **“Used in Bundles: N”** with list + links.  
- Disable **Delete**. Show **Archive** and **Replace in Bundles** actions.

**Replace in Bundles wizard:**
- Batch-replace a retired variant across selected bundles → bump `version`, recompute, reindex, audit log.

**Promotion policy UI:**
- **Plugin Settings → Bundles:**  
  - “Site-wide promotions apply to bundle items?” → `Exclude` / `Allow (stack)`  
  - (If Allow) “Max cumulative discount on bundle items (%)” → optional numeric
- **Promotion editor (all non-bundle promos):**  
  - “Apply to bundle items?” → `Inherit global` / `Never` / `Always`
- **Bundle editor (each bundle):**  
  - “Allow site-wide promos on this bundle?” → `Inherit global` / `No` / `Yes`

---

## 13) Search & Reporting

- Index the **shell** (if used) with:
  - `isBundle: true`
  - `bundleId`
  - `bundlePrice`
  - `bundleAvailability` = `A_final`
  - `bundleFacet: "Bundle"`
  - optional `bundleComponents: [{variantId, qty}]`

- **Item-level revenue/COGS/tax** come from **child lines** only.  
- Bundle-level reporting: group by `bundleId/bundleName` on child lines.  
- Exclude header and shell from analytics.

---

## 14) Acceptance Tests (GWT)

1) **Add percent bundle**  
**Given** a bundle with 20% off and variants A,B  
**When** I add 3 bundles  
**Then** order has a header + child lines for A,B with `bundlePctApplied=20` and `Σ adj = -D`

2) **Add fixed-price bundle (rounding)**  
**Given** a bundle fixed price below sum(A,B)  
**When** I add 1 bundle  
**Then** child lines have prorated adjustments; remainder applied to largest `S_i`; `Σ adj = -D` exactly.

3) **Adjust bundle quantity**  
**Given** an order with `bundleKey X`  
**When** I change quantity 2 → 5  
**Then** child quantities and snapshots update; availability validated.

4) **Remove bundle**  
**Given** an order with `bundleKey X`  
**When** I remove it  
**Then** header and all child lines are removed.

5) **Variant archive protection**  
**Given** a variant used by an `ACTIVE` bundle  
**When** I archive the variant  
**Then** bundle becomes `BROKEN`, add-to-cart disabled, reindex queued.

6) **Variant delete blocked**  
**Given** a variant used by an `ACTIVE` bundle  
**When** I attempt delete  
**Then** operation is blocked (RESTRICT) with clear message.

7) **Shell delete managed** (if shell exists)  
**Given** a shell product linked to an `ACTIVE` bundle  
**When** I delete the product  
**Then** warn → unlink → archive bundle → reindex; past orders unaffected.

8) **Partial returns**  
**Given** an order with a bundle  
**When** I refund a single child line  
**Then** refund uses that line’s **actual paid** (after adjustments) and its tax category.

9) **Promotions policy (exclude by default)**  
**Given** global = Exclude, a site-wide 10% promo  
**When** I add a bundle and a standalone SKU  
**Then** the standalone gets -10%; bundle children get only `BUNDLE_PRICING`.

10) **Promotions policy (stacking with cap)**  
**Given** global = Allow (stack), cap = 40%  
**When** a bundle child would exceed cap  
**Then** total discount for that line is clamped at 40%.

---

## 15) Implementation Plan (Do-Now Checklist)

- [ ] Add `OrderLine` customFields per §3  
- [ ] Implement Shop mutations: `addBundleToOrder`, `adjustBundleInOrder`, `removeBundleFromOrder`  
- [ ] Implement `ApplyBundleLineAdjustments` PromotionAction (reads snapshots only, tag source `BUNDLE_PRICING`)  
- [ ] Global/Promotion/Bundle toggles for site-wide promos per §8 (Exclude/Allow + overrides + optional cap)  
- [ ] Enforce **RESTRICT** on `BundleItem → ProductVariant`  
- [ ] Event subscribers + job queue per §11  
- [ ] Admin: Bundle editor UI, Bundle Item → Product Shell inherited summary + **Edit Product** deep-link  
- [ ] Admin: Variant detail “Used in Bundles”, Replace wizard  
- [ ] (Optional) Product shell with `isBundle`, `bundleId`; shell variant `trackInventory=false`  
- [ ] Index fields & triggers per §13  
- [ ] Nightly consistency job  
- [ ] Docs: Refund policy (Proportional keep) & Reporting rules

---

## 16) Non-Goals / Explicit Avoidance

- No stock decrement on shell product (ever).  
- No revenue/tax recorded on header lines (group rows).  
- No recomputation of discounts inside the bundle PromotionAction; it **reads stored snapshots only**.

