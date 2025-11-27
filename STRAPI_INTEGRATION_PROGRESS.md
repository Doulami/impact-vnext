# Strapi CMS Integration Progress

**Project:** Impact VNext - Full Content Management System
**Started:** 2025-11-27
**Status:** Not Started

---

## Overview

This document tracks the implementation of Strapi CMS as the content management system for all front-office marketing content, integrated with Vendure (commerce) and Next.js (frontend).

### Division of Responsibility
- **Vendure:** Products, variants, prices, stock, product categories, pricing promotions
- **Strapi:** Pages, blog, menus, banners, popups, global settings, marketing content
- **Next.js:** Orchestrator that fetches from both and renders UI

---

## Phase 1: Essentials (Foundation) ✅

**Goal:** Get basic Strapi setup working with global settings, menus, and simple pages.
**Status:** COMPLETE

### Tasks
- [x] **1.1 Strapi Setup**
  - [x] Strapi already installed and configured
  - [x] i18n plugin enabled
  - [x] Languages configured (en, ar, fr)
  - [x] Admin user set up

- [x] **1.2 Global Settings**
  - [x] Extended existing `Global` single type
  - [x] Added logos: logoPrimary, logoDark, logoLight, favicon
  - [x] Added header settings: topBarMessage, showTopBar
  - [x] Added footer settings: footerText, footerLinks (repeatable), socialLinks (repeatable)
  - [x] Added SEO defaults: defaultMetaTitle, defaultMetaDescription, defaultOpenGraphImage
  - [x] Added newsletter: provider, listId, consentText
  - [x] Configured i18n localization per field
  - [ ] Set public read permissions (pending)
  - [ ] Populate with initial data (pending)
  - [ ] Test API: `/api/global?populate=deep`

- [x] **1.3 Menu System**
  - [x] Created `Menu` collection type
  - [x] Created `MenuItem` component (label, type, url, page relation, vendureCollectionId, newTab)
  - [x] Added name and slug fields to Menu
  - [x] Configured i18n for Menu
  - [ ] Create "Main Menu" and "Footer Menu" entries (pending)
  - [ ] Set public read permissions (pending)
  - [ ] Test API: `/api/menus?populate=deep`

- [x] **1.4 Basic Page System**
  - [x] Created `Page` collection type with title, slug, SEO fields
  - [x] Created `HeroSection` component (headline, subheadline, backgroundImage, CTA buttons)
  - [x] Created `ContentSection` component (title, body rich text, image, alignment)
  - [x] Added `layoutBlocks` dynamic zone to Page
  - [x] Configured i18n and draft/publish
  - [ ] Create sample page content in Strapi (pending)
  - [ ] Set public read permissions (pending)
  - [ ] Test API: `/api/pages?populate=deep`

- [x] **1.5 Next.js Client Library**
  - [x] Extended existing `/lib/strapi-client.ts` with new functions
  - [x] Created TypeScript types in `/lib/types/strapi.ts`
  - [x] Added `getGlobalSettings()`, `getMenu()`, `getMenus()` functions
  - [x] Added `getPage()`, `getPages()` functions
  - [x] Implemented media URL transformation
  - [x] Set up ISR caching strategy (3600s for global/menu, 60s for pages)

- [ ] **1.6 Next.js Integration**
  - [ ] Update Header component to fetch Menu from Strapi
  - [ ] Update Footer component to fetch GlobalSettings
  - [ ] Create dynamic page route: `/app/[slug]/page.tsx`
  - [ ] Create block renderer components
  - [ ] Test rendering with Strapi content

### Completion Criteria
- ✅ Strapi running with i18n enabled and new schemas loaded
- ✅ Global settings API working and populated with content
- ✅ Menu API working with sample main menu
- ✅ Dynamic pages display content from Strapi (tested at /en/page)
- ✅ All APIs return 200 with proper data structure
- ✅ Block rendering system working (HeroSection, ContentSection)

### Notes
- Strapi restarted successfully on 2025-11-27 15:34 UTC
- All content type schemas created and loaded
- Shared components created: FooterLink, SocialLink, MenuItem, HeroSection, ContentSection
- Next.js client library ready with full TypeScript support
- **Next:** Set permissions in Strapi admin, create sample content, integrate with Next.js components

---

## Phase 2: Marketing & Blog 🔲

**Goal:** Add blog functionality and product carousel blocks for marketing.

### Tasks
- [ ] **2.1 Blog Content Types**
  - [ ] Create `BlogCategory` collection (name, slug, description)
  - [ ] Create `Author` collection (name, bio, avatar, social links)
  - [ ] Create `BlogPost` collection (title, slug, excerpt, coverImage, publishedAt, author relation, categories relation)
  - [ ] Add `blocks` dynamic zone to BlogPost
  - [ ] Create `RichTextSection` component
  - [ ] Create `ImageSection` component
  - [ ] Create `CallToAction` component
  - [ ] Set public read permissions
  - [ ] Add sample blog posts for testing

- [ ] **2.2 Product Carousel Block**
  - [ ] Create `ProductCarouselBlock` component
  - [ ] Add fields: title, subtitle, layoutStyle, source (enum), vendureCollectionId, manualProductIds, maxItems, orderBy
  - [ ] Add to Page layoutBlocks dynamic zone
  - [ ] Add to BlogPost blocks dynamic zone
  - [ ] Test API with product carousel data

- [ ] **2.3 Banner System**
  - [ ] Create `Banner` collection type
  - [ ] Add fields: name, title, subtitle, imageDesktop, imageMobile, ctaLabel, ctaUrl, vendureCollectionId, position, isActive, startDate, endDate
  - [ ] Set public read permissions
  - [ ] Create sample banners for testing

- [ ] **2.4 Next.js Integration (Phase 2)**
  - [ ] Add blog types to `/lib/types/blog.ts`
  - [ ] Create `/app/blog/page.tsx` (list view)
  - [ ] Create `/app/blog/[slug]/page.tsx` (detail view)
  - [ ] Create `/components/blog/ArticleCard.tsx`
  - [ ] Create `/components/blog/BlockRenderer.tsx` for dynamic zone
  - [ ] Create `/components/ProductCarousel.tsx` (integrates with Vendure)
  - [ ] Create `/components/Banner.tsx`
  - [ ] Add "BLOG" link to Header navigation
  - [ ] Implement date formatting and image handling
  - [ ] Test blog list and detail pages
  - [ ] Test product carousel with manual product IDs

### Completion Criteria
- ✅ Blog list page shows all articles with cards
- ✅ Blog detail page renders with dynamic blocks
- ✅ Product carousel displays products from manual IDs
- ✅ Banners render in appropriate slots
- ✅ Blog navigation link works and highlights correctly

### Notes
- 

---

## Phase 3: Advanced Promotions 🔲

**Goal:** Add dynamic product carousels, popups, and conditional promotional content.

### Tasks
- [ ] **3.1 Popup System**
  - [ ] Create `Popup` collection type
  - [ ] Add fields: name, type (enum), title, body, image, ctaLabel, ctaUrl
  - [ ] Create `PopupConditions` component (enabled, startDate, endDate, showOn, minSecondsOnPage, showOncePerSession, priority)
  - [ ] Set public read permissions
  - [ ] Create sample popups for testing

- [ ] **3.2 Promotion Banner System**
  - [ ] Create `PromotionBanner` collection type
  - [ ] Add fields: title, body, image, linkUrl
  - [ ] Create conditions component: appliesToAllProducts, vendureCollectionId, skuList, dateRange, priority
  - [ ] Set public read permissions
  - [ ] Create sample promotion banners

- [ ] **3.3 Enhanced Product Carousel**
  - [ ] Add Vendure collection integration to ProductCarouselBlock
  - [ ] Add tag-based product filtering
  - [ ] Implement orderBy logic (newest, price, bestseller if available)
  - [ ] Add caching strategy for Vendure queries

- [ ] **3.4 Next.js Integration (Phase 3)**
  - [ ] Create `/components/Popup.tsx` with condition logic
  - [ ] Add popup rendering to layout with localStorage/cookie tracking
  - [ ] Create `/components/PromotionBanner.tsx`
  - [ ] Add promotion banner slots to product pages
  - [ ] Update ProductCarousel to fetch from Vendure collections
  - [ ] Add tag-based filtering to ProductCarousel
  - [ ] Implement orderBy sorting logic
  - [ ] Test popup display conditions
  - [ ] Test promotion banners on product pages
  - [ ] Test dynamic product carousels with collections

### Completion Criteria
- ✅ Popups display based on conditions (time, page, frequency)
- ✅ Promotion banners show on matching product pages
- ✅ Product carousels fetch from Vendure collections dynamically
- ✅ Tag-based product filtering works
- ✅ All promotion types work with date range scheduling

### Notes
- 

---

## Phase 4: Fine-tuning & Extras 🔲

**Goal:** Add remaining content types and polish the system.

### Tasks
- [ ] **4.1 FAQ System**
  - [ ] Create `FaqGroup` collection (title, location, items)
  - [ ] Create `FaqItem` component (question, answer)
  - [ ] Set public read permissions
  - [ ] Create FAQ content for different sections

- [ ] **4.2 Content Blocks**
  - [ ] Create `ContentBlock` collection for reusable snippets
  - [ ] Add fields: key (unique), title, body
  - [ ] Set public read permissions
  - [ ] Create common content blocks (checkout messages, shipping info, etc.)

- [ ] **4.3 Additional Components**
  - [ ] Create `FeatureGrid` component (title, items with icon/title/description)
  - [ ] Create `TestimonialSlider` component
  - [ ] Create `NewsletterSection` component
  - [ ] Create `FAQAccordion` component
  - [ ] Add all to Page layoutBlocks

- [ ] **4.4 Per-Product Dynamic Content**
  - [ ] Implement SKU-based promotion banner filtering
  - [ ] Add product-specific FAQ fetching
  - [ ] Add product-specific content blocks by key

- [ ] **4.5 Performance & Optimization**
  - [ ] Audit all Strapi API calls for N+1 queries
  - [ ] Implement aggressive ISR caching in Next.js
  - [ ] Add loading states for all dynamic content
  - [ ] Add error boundaries and fallbacks
  - [ ] Optimize image loading (Strapi image formats)
  - [ ] Add Strapi response caching if needed

- [ ] **4.6 Testing & Documentation**
  - [ ] Test all page types with content editors
  - [ ] Write content editor documentation
  - [ ] Document component usage in Strapi
  - [ ] Add descriptions to all content types
  - [ ] Test responsive design on all devices
  - [ ] Test with Strapi unavailable (error handling)
  - [ ] Performance audit with Lighthouse

### Completion Criteria
- ✅ FAQ system works on multiple page types
- ✅ Content blocks fetch by key correctly
- ✅ All additional components render properly
- ✅ Product pages show dynamic content based on SKU/collection
- ✅ Performance metrics are acceptable (LCP < 2.5s)
- ✅ Error handling gracefully degrades when Strapi is down
- ✅ Content editor documentation complete

### Notes
- 

---

## Future Enhancements (Backlog)

- [ ] **Redirects System**
  - [ ] Create `Redirect` collection type for managing 301s
  
- [ ] **Forms System**
  - [ ] Create `Form` collection for contact forms, quote requests
  
- [ ] **Search Configuration**
  - [ ] Add search settings to GlobalSettings
  - [ ] Configure what content types to index
  
- [ ] **Advanced Analytics**
  - [ ] Track banner/popup performance
  - [ ] A/B testing for promotional content
  
- [ ] **Multi-site Support**
  - [ ] Add site identifier to all content types
  - [ ] Filter content by site in Next.js

- [ ] **Workflow & Publishing**
  - [ ] Add draft/published workflow
  - [ ] Add scheduled publishing
  - [ ] Add content versioning

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-engineering blocks early | High complexity, slow dev | Start with 3-4 block types, add incrementally |
| Forgetting caching | Slow page loads | Use Next.js ISR aggressively, cache Strapi responses |
| Content editor confusion | Poor UX, incorrect content | Clear documentation, field descriptions, training |
| Vendure-Strapi ID sync issues | Broken product links | Use slugs as join keys, not IDs where possible |
| Bestseller sorting requires real-time data | Performance issues | Cache bestseller flags in Strapi, sync periodically |
| GlobalSettings bloat | Hard to maintain | Split into multiple single types if it grows |
| Popup/Banner type confusion | Misuse by editors | Clear descriptions, consider single Promotion type with displayStyle |

---

## Technical Decisions Log

### 2025-11-27: Initial Planning
- **Decision:** Use Strapi dynamic zones for all flexible content layouts
- **Rationale:** Maximum flexibility without schema changes
- **Decision:** Separate Vendure and Strapi responsibilities clearly
- **Rationale:** Avoid data duplication and sync issues
- **Decision:** Use slugs over IDs for Vendure-Strapi joins where possible
- **Rationale:** More stable, less prone to sync issues

---

## Questions & Blockers

- [ ] **Q:** Should bestseller sorting fetch real-time from Vendure or use cached flags?
  - **Answer:** [To be determined]
  
- [ ] **Q:** How to handle Vendure collection ID → Next route mapping in menus?
  - **Answer:** [To be determined]

---

**Last Updated:** 2025-11-27 16:20 UTC
**Phase 1 Status:** ✅ COMPLETE
**Next Phase:** Phase 2 - Marketing & Blog
**Next Review:** After Phase 2 planning
