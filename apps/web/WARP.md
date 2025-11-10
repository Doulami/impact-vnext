# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Prerequisites
Before starting the web app, ensure:
1. **Docker containers are running** (use `default` context, not `desktop-linux`):
   - `vendure-postgres` on port 6543
   - `impact-postgres` on port 5432
   - `impact-redis` on port 6379
2. **Vendure API is running** on port 3000

### Starting Services

**1. Start Docker containers (if not running):**
```bash
# Switch to default docker context
docker context use default

# Check containers are running
docker ps

# If vendure-postgres is not running:
docker start vendure-postgres
```

**2. Start Vendure API (from apps/api):**
```bash
cd apps/api
npm run dev  # Runs on port 3000
```

**3. Start Next.js Web App (from apps/web):**
```bash
cd apps/web
npm run dev  # Runs on port 3001
```

### Core Development Commands
```bash
# Start development server (runs on port 3001)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

### Environment Setup
- `.env.local` is already configured
- **Vendure API**: http://localhost:3000/shop-api
- **Next.js App**: http://localhost:3001
- **Strapi CMS**: http://localhost:1337 (when needed)

## Architecture Overview

This is the **web storefront** app within the impact-vnext monorepo - a modern composable commerce stack using:
- **Next.js 16** with App Router and React 19 
- **TypeScript** with strict configuration
- **Tailwind CSS v4** for styling
- **Apollo Client** for GraphQL (Vendure backend integration)
- **React Compiler** enabled for optimization

### Project Structure
```
src/
├── app/                 # Next.js App Router pages and layouts
│   ├── layout.tsx      # Root layout with fonts and global styles
│   ├── page.tsx        # Homepage (Optimum Nutrition-inspired design)
│   └── globals.css     # Tailwind imports and theme variables
└── lib/
    └── theme.ts        # Theme utilities and Strapi StoreConfig integration

public/
├── impact-logo.svg          # Brand logo (placeholder - replace with actual)
├── product-collagen.svg     # Product images (replace .svg with actual .png)
├── product-hydro-eaa.svg
├── product-citrulline.svg
├── product-isotonic.svg
└── PRODUCT_IMAGES_README.md # Instructions for replacing placeholders
```

### Key Architecture Patterns

#### Dynamic Theming System
- Admin-editable brand colors via Strapi StoreConfig
- CSS custom properties in `globals.css` for theme variables
- Sports nutrition category color mapping
- Fallback to default theme when Strapi unavailable

#### Feature Flag Integration
- Feature flags managed via Strapi StoreConfig (single-type)
- Graceful fallbacks when features are disabled
- Key flags: payments.gpgEnabled, loyalty, search.meiliEnabled

#### Styling Approach
- Tailwind CSS v4 with `@theme inline` configuration
- Sports-specific utility classes and gradients
- Brand colors: `--brand-primary`, `--brand-secondary`, `--brand-accent`
- Category colors for different product types

## Monorepo Context

This web app is part of a larger composable commerce stack:
- **Backend**: `apps/api` (Vendure GraphQL APIs)
- **CMS**: `apps/cms` (Strapi for content and feature flags)
- **Packages**: Shared utilities for payments, loyalty, shipping, etc.

### Core Principle
**Browse → Cart → Pay must work even if any optional feature is OFF.** Always ensure graceful fallbacks.

## Development Guidelines

### Component Architecture
- Use function components with TypeScript interfaces
- Keep components in the same file when they're page-specific (see page.tsx examples)
- Use Lucide React for consistent iconography

### Styling Standards
- Use Tailwind classes with semantic color tokens (`text-primary`, `bg-secondary`)
- Leverage CSS custom properties for theme values
- Implement responsive design with mobile-first approach

### Integration Points
- Apollo Client for Vendure GraphQL API calls
- Strapi integration via theme.ts utilities
- Environment-based feature flag configuration

### Testing
- No specific test framework configured yet
- Run linting with `npm run lint` before commits

## Current Implementation Status

### ✅ Completed
- **Homepage Design**: Full Optimum Nutrition-inspired layout implemented
  - Animated gradient navigation bar (blue wave effect with CSS variables)
  - Black header with search bar and user account dropdown
  - Top announcement bar for promotions
  - Split hero banner (left: content + CTA, right: product image)
  - Product carousel with ratings and prices (real data from Vendure!)
  - Split promotional banners (green/orange sections)
  - "Save on favorites" section with discount tiers
  - Questions banner with mascot placement
  - "Unlocked" promotional banner
  - Goal cards grid (5 colorful product categories)
  - Education resources section
  - Newsletter signup with 15% off offer
  - Comprehensive footer with 4 columns

- **Product Listing Page (PLP)**: Professional search-based architecture
  - **Server-side filtering**: Collection/category, price ranges, facets, stock status
  - **Server-side sorting**: Name A-Z/Z-A, Price low/high (uses Vendure search API)
  - **Infinite scroll**: "Load More" with smooth pagination, no page refresh
  - **URL state management**: All filters/sort reflected in URL for sharing/bookmarks
  - **Real-time counts**: Facet counts, price range counts update as filters change
  - **Variant price ranges**: Shows min-max pricing when products have multiple variants
  - **Active filter management**: Clear individual filters or clear all
  - **Responsive design**: 2-4 column grid based on screen size

- **Search Functionality**: Elasticsearch-powered search with independent operation
  - **Homepage search**: Full dropdown with "View all results" navigation
  - **PLP search**: Independent dropdown that doesn't interfere with filters
  - **Real-time suggestions**: Debounced search with 300ms delay
  - **URL parameter sync**: Search terms reflected in URL for sharing
  - **Cross-page consistency**: Unified Header component with search

- **Shopping Cart System**: Production-ready with confirmation safeguards
  - **Persistent storage**: localStorage with graceful error handling
  - **Multiple interfaces**: MiniCart dropdown, CartDrawer mobile, full Cart page
  - **Double confirmation**: All destructive actions (remove item, clear cart) require confirmation
  - **Confirmation modals**: Accessible with keyboard support and clear messaging
  - **Smart interactions**: Click-based (not hover) with smooth animations
  - **Variant handling**: "ADD TO CART" vs "CHOOSE OPTIONS" logic
  - **Mobile optimized**: Touch-friendly drawer interface

- **Backend Integration**: Vendure GraphQL API with search optimization
  - Apollo Client configured with proper search queries
  - Uses Vendure Shop API `search` with `groupByProduct: true`
  - Featured products component fetches real data
  - Graceful fallback to mock data if API unavailable
  - Modern TypeScript types for search results and products
  - React hooks: `useSearch()`, `useCollections()`, `useFacets()`, `useUrlState()`

- **Product Images**: Real Impact Nutrition product images in place
  - Collagen-C, Hydro EAA, Citrulline, Isotonic
  - Images located in `/public/products/`

- **User Authentication System**: Complete auth flow with JWT token management
  - Login/Register pages with form validation
  - Customer verification workflow (email verification required)
  - Persistent authentication state with useAuth hook
  - Account dashboard with navigation hub
  - Profile settings (update name, email, phone, title)
  - Security settings (password management with strength indicator)
  - User menu dropdown in header
  - Protected routes with redirect logic

- **Checkout & Payment System**: Full COD checkout flow
  - Multi-step checkout (Shipping → Delivery → Payment → Confirmation)
  - Cash on Delivery (COD) payment method configured
  - Custom COD payment handler for Vendure backend
  - Address form with customer pre-fill
  - Shipping method selection
  - Order placement with Vendure integration
  - Thank you page (`/thank-you`) with order details and tracking info
  - Analytics-ready (Google Analytics, Facebook Pixel hooks)

- **Order Management**: Complete order history and details
  - Order History page (`/account/orders`) with filtering, sorting, search
  - Order Details page (`/account/orders/[code]`) with:
    - Full order information and item list
    - Order timeline visualization
    - Shipping address and customer info
    - Payment method and shipping method details
    - Status badges with proper formatting
  - Order status tracking (PaymentAuthorized, PaymentSettled, Shipped, Delivered, etc.)

- **Unified Button Component**: Reusable button system with CSS variables
  - Variants: primary, secondary, outline, danger, ghost
  - Sizes: sm, md, lg
  - Support for buttons and links (Next.js Link)
  - Loading states with spinner
  - All colors use CSS variables (no hardcoded colors)
  - Used across: Cart, Checkout, Auth pages, Account pages, Thank You page

- **Bundle Plugin Integration**: Exploded Bundle System (v2 Architecture)
  - **Bundle System Architecture**: "Exploded Bundles" with proper Vendure 3.5+ integration
    - **Bundle Definition**: Plugin entity (`Bundle` + `BundleItem`) as source of truth
    - **Runtime Behavior**: Single visible parent group + hidden component children
    - **Stock & Revenue**: Always tracked on child ProductVariants only
    - **Order Structure**: Uses OrderLine customFields for bundle grouping and metadata
  - **Frontend Implementation**: Complete cart-to-checkout bundle experience
    - **Bundle Listing Page**: `/bundles` with unified design and filtering
    - **Bundle Product Detail Page (PDP)**: 
      - Enhanced PDP displays computed `effectivePrice` (in cents) from Bundle entity
      - Component breakdown UI with individual item prices and quantities
      - Savings calculation showing total saved vs buying separately
      - Proper price display using shell product's `customFields.bundlePrice` (synced from backend)
      - Bundle items section with "What's Included" breakdown before Add to Cart
    - **Product Listing Integration**: Bundles appear alongside products with type filtering
    - **Bundle Pricing**: 
      - `useCombinedSearch` hook properly converts bundle prices (effectivePrice in cents)
      - Product listing/search displays correct bundle prices
      - Price consistency across all views (PDP, listing, related products)
    - **Bundle Cart System**: Single bundle items with expandable component details
    - **Bundle Indicators**: Blue "Bundle" badges with Package icons throughout
  - **Backend Implementation Status**:
    - ✅ **Bundle Entities**: `Bundle` and `BundleItem` with proper TypeORM relations
    - ✅ **Shop API Queries**: `bundle`, `bundles` GraphQL queries working
    - ✅ **Price Computation**: `effectivePrice` (cents) and `totalSavings` computed properties
    - ✅ **Shell Product Sync**: Bundle prices synced to shell product customFields
    - ⚠️ **Order Mutations**: `addBundleToOrder` needs exploded bundle implementation
    - ⚠️ **OrderLine CustomFields**: Need bundle metadata fields for grouping
    - ⚠️ **Promotion Integration**: Bundle-proof promotion system needed

- **Related Products Component**: Smart collection-based product recommendations
  - Automatically detects if product is in "featured" collection
  - Shows featured products carousel for featured items
  - Shows same-collection products for non-featured items
  - Excludes current product and "featured" collection from related products
  - Uses GraphQL query `GET_RELATED_PRODUCTS` with collection filtering
  - Client-side filtering to exclude current product
  - Consistent "Related Products" title regardless of source

### 🚧 In Progress
- **Bundle Search Integration**: Complete backend bundle indexing in Elasticsearch
  - Bundle indexing jobs need to be implemented in backend
  - Enhanced search API endpoints for combined product/bundle queries
  - Integration with products page filtering system for bundle attributes

### 📋 TODO
- **Bundle Plugin v2 Implementation** (Exploded Bundle Architecture):
  - **Phase 1 - Core Exploded Bundle (Urgent - Fixes Checkout)**:
    - [ ] Add OrderLine customFields for bundle metadata (bundleKey, bundleId, etc.)
    - [ ] Implement `addBundleToOrder` with exploded bundle logic
    - [ ] Implement `adjustBundleInOrder` and `removeBundleFromOrder` mutations
    - [ ] Basic bundle promotion exclusion (prevent external promos on bundle children)
  - **Phase 2 - Safety & Lifecycle**:
    - [ ] Add RESTRICT constraints on ProductVariant deletion when used in bundles
    - [ ] Implement bundle state management (DRAFT→ACTIVE→BROKEN→ARCHIVED)
    - [ ] Event subscribers for variant changes (price/stock updates)
    - [ ] Bundle recomputation jobs when components change
  - **Phase 3 - Advanced Features**:
    - [ ] Full promotion stacking system with policy controls
    - [ ] Admin UI bundle lifecycle management
    - [ ] Bundle analytics and reporting
    - [ ] Search integration with bundle indexing
- **ElasticSearch Plugin**: Replace DefaultSearchPlugin with ElasticSearchPlugin for:
  - Enhanced search performance for both products and bundles
  - Advanced sorting options (by date, relevance)
  - Price aggregations and buckets
  - Spatial search capabilities
- **Account Management Features** (from ACCOUNT_MANAGEMENT_TODO.md):
  - Address Book Management
  - Wishlist/Favorites System (including bundle wishlists)
  - Loyalty Points & Rewards
  - Email Preferences & Notifications
  - Customer Support Integration
  - Returns & Refunds Management
- **Button Unification Remaining**:
  - Replace hardcoded buttons in remaining components (SearchBar, ProductReviews, RelatedProducts, ConfirmationModal)
- **Performance**: Optimize images, lazy loading, caching
- **SEO**: Add meta tags, structured data, sitemaps for bundle pages
- **Payment Methods**: Add Stripe/PayPal for online payments (COD is production-ready)

## Common Development Tasks

- **Adding new pages**: Create in `src/app/` following App Router conventions
- **Replacing product images**: Save PNG files to `/public/` (see PRODUCT_IMAGES_README.md)
- **Styling updates**: Modify theme variables in `globals.css` or add Tailwind classes
- **Feature flags**: Update `theme.ts` and StoreConfig types for new flags
- **Component development**: Follow existing patterns in `page.tsx` for consistency
- **Homepage sections**: All sections have IDs for easy navigation and styling
