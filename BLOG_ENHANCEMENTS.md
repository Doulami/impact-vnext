# Blog Detail Page Enhancements

## Overview
Enhanced the blog detail page to display the `longdescription` rich text field and improved author presentation with email contact information.

## Changes Made

### 1. Type System Updates
**File:** `apps/web/src/lib/types/blog.ts`
- Added `longdescription: string` to Article interface
- Added `email: string | null` to author object

### 2. API Client Updates  
**File:** `apps/web/src/lib/strapi-client.ts`
- Extract `longdescription` from Strapi (fallback to empty string)
- Extract author `email` from nested structure

### 3. Blog Detail Page
**File:** `apps/web/src/app/blog/[slug]/page.tsx`

**New Sections:**
1. **Long Description** - Displays rich HTML content before blocks
2. **Author Bio** - Enhanced section with avatar, name, and email

**Layout Flow:**
```
1. Breadcrumb
2. Category Badge  
3. Title
4. Description
5. Meta (Date, Author)
6. Cover Image
7. Long Description (NEW)
8. Dynamic Blocks
9. Author Bio (NEW - enhanced)
10. Share Section
11. Back to Blog
```

### 4. Prose Styling
**File:** `apps/web/src/app/globals.css`
- Added `.prose` and `.prose-lg` classes
- Styled: headings, paragraphs, links, lists, blockquotes, code, tables

## Usage

### In Strapi:
1. Edit article → use `longdescription` rich text field
2. Edit author → fill in `email` field
3. Email displays with mailto link in author bio

### Styling:
- Long description uses `prose prose-lg` for typography
- Author bio: gray card with rounded corners
- Avatar: 64x64px with fallback to brand-colored icon

## Files Modified
- `apps/web/src/lib/types/blog.ts`
- `apps/web/src/lib/strapi-client.ts`  
- `apps/web/src/app/blog/[slug]/page.tsx`
- `apps/web/src/app/globals.css`
