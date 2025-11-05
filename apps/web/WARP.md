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
  - Black header with search bar and navigation
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

### 🚧 In Progress
- **ElasticSearch Integration**: DefaultSearchPlugin currently used, ElasticSearch plugin available for enhanced features
- **Product Detail Pages (PDP)**: GraphQL queries ready, UI components not implemented
- **Search Interface**: Backend search ready, need to add search bar functionality

### 📋 TODO
- **ElasticSearch Plugin**: Replace DefaultSearchPlugin with ElasticSearchPlugin for:
  - Enhanced search performance
  - Advanced sorting options (by date, relevance)
  - Price aggregations and buckets
  - Spatial search capabilities
- **Product Detail Pages**: Build PDP using existing `GET_PRODUCT_BY_SLUG` query
- **Search Interface**: Add search bar with autocomplete and suggestions
- **Shopping Cart**: Implement cart functionality
- **User Authentication**: Add login/register flow
- **Performance**: Optimize images, lazy loading, caching
- **SEO**: Add meta tags, structured data, sitemaps

## Common Development Tasks

- **Adding new pages**: Create in `src/app/` following App Router conventions
- **Replacing product images**: Save PNG files to `/public/` (see PRODUCT_IMAGES_README.md)
- **Styling updates**: Modify theme variables in `globals.css` or add Tailwind classes
- **Feature flags**: Update `theme.ts` and StoreConfig types for new flags
- **Component development**: Follow existing patterns in `page.tsx` for consistency
- **Homepage sections**: All sections have IDs for easy navigation and styling
