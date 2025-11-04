# Milestones & Acceptance Criteria

## NEW EXECUTION ORDER (Single Source of Truth)

**API & Web shells come FIRST, Strapi comes AFTER, Admin UI elevation is LAST.**

---

## M1: API & Web Shells Up ✓
**Status**: Complete  
**Deliverables**:
- [x] Monorepo structure (apps, packages, docs)
- [x] Root README with stack overview & feature flags
- [x] .env.example with all service placeholders
- [x] Architecture overview (stack-overview.md)
- [x] StoreConfig spec (store-config.md)
- [x] Storefront page map (storefront-page-map.md)
- [x] Feature specs: payments, shipping, loyalty, search, perf/PWA, admin
- [x] Runbooks: ops, QA checklist
- [x] Placeholder READMEs for each app/package
- [x] This milestones document
- [x] Vendure and Next.js initialized; no CMS dependency

**Acceptance**: All documentation complete; team aligned on architecture & feature set; API/Web can start independently.

---

## M2: Vendure Minimal Config + DB Connection
**Timeline**: 1 week  
**Priority**: High (foundation)

### Deliverables
- **Vendure setup** (apps/api):
  - GraphQL Shop schema (products, collections, cart, orders)
  - Demo catalog (5 products, 2 collections)
  - Payment & shipping resolver stubs (feature-gated)
  - Database connection (SQLite for dev, PostgreSQL for prod)

### Acceptance Criteria
- [ ] Vendure API responds to GraphQL queries
- [ ] Shop & Admin endpoints reachable
- [ ] Demo catalog accessible via GraphQL
- [ ] Database connection stable
- [ ] No dependency on CMS for basic functionality

---

## M3: Web Page Scaffolds (Demo Data)
**Timeline**: 2-3 weeks  
**Priority**: High (revenue-blocking)

### Deliverables
- **Next.js app** (apps/web):
  - Homepage, collection (PLP), product (PDP), cart, checkout (multi-step), account (login/register), content pages
  - Demo products from Vendure (hardcoded initially)
  - PWA manifest + service worker skeleton (offline shell for PDP + cart)
  - Responsive design (mobile-first)
  - ISR config on PLP/PDP (revalidate 600–1800s)
  - Next/Image optimization for product photos
  - Structured data (Schema.org) for home, PLP, PDP

### Acceptance Criteria
- [ ] Storefront loads home, PLP, PDP, cart without errors
- [ ] Core browse → cart → checkout flow works with demo data
- [ ] PWA manifest valid; service worker registered
- [ ] Offline mode shows cached PDP shell
- [ ] SEO: all pages have title, meta description, structured data
- [ ] Mobile: responsive on 320px, 768px, 1024px viewports
- [ ] No dependency on CMS for basic browse/cart/pay functionality

---

## M4: Strapi Setup (StoreConfig + Feature Flags)
**Timeline**: 1 week  
**Priority**: Medium (enables feature toggles)

### Deliverables
- **Strapi setup** (apps/cms):
  - StoreConfig single-type with all feature flags (all OFF except payments.gpgEnabled=true)
  - Demo content (hero banners, promo bars)
  - Editorial collections (header/footer menus)

- **Feature flags wired**:
  - feature-flags SDK (reads from Strapi)
  - Web conditionally renders payment methods, loyalty UI, search (Meili vs. fallback)
  - Flags cacheable (5–10 min in API, 30 min browser)
  - Environment variable fallbacks documented until Strapi is ready

### Acceptance Criteria
- [ ] Feature flags read from Strapi on startup
- [ ] Environment fallbacks work when Strapi unavailable
- [ ] Payment methods show/hide based on `payments.gpgEnabled`
- [ ] Loyalty section hidden when flag OFF
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M5: Payments: GPG Checkout Integration
**Timeline**: 2 weeks  
**Priority**: High (revenue-blocking)

### Deliverables
- **GPG Payment Provider** (packages/payments-gpg):
  - Vendure plugin integrating GPG provider
  - Checkout handler: generate signed redirect URL
  - Webhook handler: `/webhooks/gpg` (authorized, captured, failed, refunded events)
  - Signature validation (HMAC SHA256)
  - Idempotency key (prevent duplicate charges)
  - Error messaging (card declined, timeout, network)

- **Vendure integration**:
  - Payment state machine: Authorized → Captured (or Failed)
  - Order transitions on payment success
  - Webhook retry logic (3 attempts, 24h window)
  - Logging: all payment events

- **Storefront**:
  - Checkout payment step shows GPG option (if `payments.gpgEnabled`)
  - Redirect to GPG hosted page on "Pay Now"
  - Handle returnUrl (success) and cancelUrl (failure)
  - Confirmation page shows payment status

### Acceptance Criteria
- [ ] Create order → redirect to GPG hosted page
- [ ] GPG payment succeeds → order marked "Paid"
- [ ] GPG payment fails → order marked "Failed"; clear error message to customer
- [ ] Webhook received → payment state updated within 5s
- [ ] Payment flag OFF → GPG option hidden; checkout still works
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M6: Shipping File Bridge
**Timeline**: 2 weeks  
**Priority**: High (revenue-blocking)

### Deliverables
- **Shipping File Bridge** (packages/shipping-file):
  - Vendure plugin: listen to "Ready to Ship" order state
  - Scheduled export: cron job (from SHIP_EXPORT_SCHEDULE env var)
  - Manual export: admin endpoint `/admin/orders/export-shipping`
  - File generation: CSV/TSV with order data
  - SFTP/HTTPS transport: upload to remote (retry 3x, 30s backoff)
  - Order metadata: mark exported_at, batch_id, file_path
  - Logging: all export events, batch status, errors

### Acceptance Criteria
- [ ] Scheduled export runs at configured time; exports all "Ready to Ship" orders
- [ ] Manual export triggered; file generated & uploaded
- [ ] Export file has correct columns & data
- [ ] Shipping flag OFF → no auto-export; manual export disabled
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M7: Loyalty (Earn/Burn + Account Surfaces)
**Timeline**: 2 weeks  
**Priority**: Medium

### Deliverables
- **Loyalty Module** (packages/loyalty):
  - Vendure plugin: listen to "Order Paid" event
  - Earn logic: calculate points (% of net order amount)
  - Burn logic: apply discount at checkout (capped % of subtotal)
  - Ledger: store all transactions (awarded, redeemed, adjusted)
  - Refund handling: reverse points on order refund

- **Account surfaces** (apps/web):
  - /account/loyalty: balance display, transaction history, redeem form
  - Checkout: loyalty input (if flag enabled) + discount preview
  - Order confirmation email: "You earned X points" message

### Acceptance Criteria
- [ ] Order paid → loyalty points awarded (ledger entry created)
- [ ] Checkout: redeem form calculates discount correctly
- [ ] Account page: balance + history displayed; no errors
- [ ] Loyalty flag OFF → no earn/burn; no surfaces shown
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M8: Search & Performance + PWA Baseline
**Timeline**: 2-3 weeks  
**Priority**: Medium

### Deliverables
- **Meilisearch integration** (packages/search):
  - Meili cluster setup (local or hosted)
  - Index schema: products, variants
  - Search query handler (if flag ON)
  - Fallback to API filter (if flag OFF)

- **Performance**:
  - Redis cache: catalog queries (60s TTL), basket (30s TTL)
  - Next.js ISR: PLP/PDP revalidate 600–1800s
  - Images: Next/Image optimization, responsive srcsets
  - Code splitting: dynamic imports for payment/search providers
  - Core Web Vitals: measure LCP, FID, CLS

- **Cloudflare (optional if cache.edgeEnabled)**:
  - Surrogate keys: per product, collection
  - Purge hooks: API plugin triggers purge on changes

### Acceptance Criteria
- [ ] Meilisearch ON: search query returns results <100ms (with typo tolerance)
- [ ] Meili OFF: fallback to API filter; results correct (no typos handled)
- [ ] Redis: catalog queries cached; hit rate >80%
- [ ] CWV: LCP <2.5s, FID <100ms, CLS <0.1 (75th percentile)
- [ ] Search flag OFF: fallback search works; acceptable UX
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M9: Content & SEO (Strapi Pages + Legal)
**Timeline**: 1-2 weeks  
**Priority**: Medium

### Deliverables
- **Strapi content**:
  - Hero blocks, promo bars, featured products, testimonials, FAQ
  - Editorial flow (draft/publish)
  - Content pages: About, Shipping & Returns, Privacy, Terms

- **Web integration**:
  - Content pages fetch from Strapi by slug
  - Hero/promo blocks render on home/collection pages
  - ISR on Strapi webhook

- **SEO**:
  - All pages: title, meta description, OG tags
  - Structured data: Organization, Product, CollectionPage, WebPage
  - XML sitemap: home + all collections + content pages
  - robots.txt: guide crawlers

### Acceptance Criteria
- [ ] Strapi content pages (About, Terms, Privacy) accessible via web
- [ ] SEO: all pages have title, meta, OG; structured data valid (JSON-LD)
- [ ] Sitemap: all product collections & content pages included
- [ ] ISR: content page change in Strapi → web page revalidates
- [ ] Mobile: pages responsive; readable on 320px
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M10: Admin UI Elevation — EXPLICITLY LAST
**Timeline**: 2-3 weeks  
**Priority**: Low (non-blocking)

### Deliverables
- **Dashboard**:
  - Revenue cards (today's sales, AOV, order count)
  - Top products, top customers, low stock alerts
  - Fulfillment backlog, recent refunds

- **Operations views**:
  - Orders board (Kanban: Paid → Picking → Shipped)
  - Picking list (print/PDF)
  - Shipping export monitor (batch status, re-export)

- **Admin extensions**:
  - Payment timeline: Authorized → Captured → Refunded
  - Manual capture/refund buttons
  - Webhook replay (for reconciliation)

### Acceptance Criteria
- [ ] Dashboard metrics correct (revenue, AOV, top products)
- [ ] Orders board: drag-to-transition state changes; filters work
- [ ] Payment timeline: all events shown with timestamps
- [ ] Manual capture: success/failure message; order state updates
- [ ] Role-based access: unauthorized users cannot access
- [ ] Mobile: views accessible on iPad (responsive)
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## M11: QA & Cutover Checklist
**Timeline**: 1 week  
**Priority**: High (go-live)

### Deliverables
- **Feature-flag ON/OFF matrix testing**
- **Mobile CWV testing**  
- **Go-live steps documentation**
- **Production environment verification**
- **Load testing & monitoring setup**

### Acceptance Criteria
- [ ] All feature flags tested in both ON and OFF states
- [ ] Mobile responsive testing completed (320px, 768px, 1024px)
- [ ] Core Web Vitals meet targets on production
- [ ] Production deployment verified
- [ ] Monitoring and alerts configured
- [ ] Core browse → cart → pay must work even if any optional feature flag is OFF

---

## Core Guarantee (All Milestones)

**"Core browse → cart → pay must work even if any optional feature flag is OFF."**

This must be validated in each milestone:
- [ ] All feature flags: OFF
- [ ] Storefront: home loads, can browse products, add to cart, checkout
- [ ] Checkout: payment method available (fallback or basic)
- [ ] Order: created successfully; marked "Paid"
- [ ] No JS errors; no 5xx errors

---

## Dependencies (Corrected Order)

**API/Web have NO dependency on CMS to start:**
- Vendure (M2) can initialize with demo data independently
- Next.js (M3) can run with hardcoded/demo content initially
- Environment variable fallbacks handle missing Strapi flags

**CMS depends on API/Web existing:**
- Strapi (M4) provides feature flags consumed by existing API/Web
- Content integration (M9) requires working API/Web foundation

**Admin UI depends on all prior milestones:**
- Admin UI (M10) is explicitly LAST and depends on all features being implemented
- Provides management interface for existing functionality

---

## Release Readiness Checklist

Before each milestone release:
- [ ] All acceptance criteria met
- [ ] Integration tests pass (>80% coverage)
- [ ] Manual QA checklist completed (qa-checklist.md)
- [ ] Documentation updated (READMEs, specs, runbooks)
- [ ] Code review: 2 approvals
- [ ] Ops runbook tested: team can follow steps
- [ ] Monitoring/alerts configured
- [ ] Rollback plan documented