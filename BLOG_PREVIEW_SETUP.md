# Blog Preview & Draft Mode Setup

This guide explains how the Strapi Preview feature is configured to allow previewing draft blog articles in Next.js.

## Overview

The preview system allows you to view draft blog articles directly from the Strapi admin panel before publishing them. It uses Next.js Draft Mode to fetch and display draft content.

## Architecture

1. **Strapi CMS** (`apps/cms/config/admin.ts`)
   - Preview handler generates preview URLs for blog articles
   - Validates content types and slugs
   - Sends users to Next.js preview route with secret token

2. **Next.js Preview Route** (`apps/web/src/app/api/preview/route.ts`)
   - Validates the secret token from Strapi
   - Enables/disables Next.js Draft Mode based on content status
   - Redirects to the article page

3. **Blog Detail Page** (`apps/web/src/app/blog/[slug]/page.tsx`)
   - Detects if Draft Mode is enabled
   - Fetches draft content when in preview mode
   - Fetches published content in normal mode

4. **Middleware** (`apps/web/src/middleware.ts`)
   - Sets CSP headers to allow iframe embedding from Strapi
   - Required for the preview iframe to work

## Setup Instructions

### 1. Environment Variables

**Strapi CMS** (`apps/cms/.env`):
```bash
CLIENT_URL=http://localhost:3001
PREVIEW_SECRET=my-secret-preview-token
```

**Next.js Web** (`apps/web/.env.local`):
```bash
NEXT_PUBLIC_CMS_URL=http://localhost:1337
PREVIEW_SECRET=my-secret-preview-token
```

⚠️ **Important**: The `PREVIEW_SECRET` must match in both files!

### 2. Restart Services

After updating environment variables, restart both services:

```bash
# Terminal 1 - Restart Strapi CMS
cd apps/cms
npm run develop

# Terminal 2 - Restart Next.js
cd apps/web
npm run dev
```

### 3. Configure Strapi Permissions (if needed)

Make sure the Article content type has public read permissions:

1. Go to Strapi Admin Panel: http://localhost:1337/admin
2. Navigate to **Settings > Users & Permissions > Public**
3. Under **Article**, enable:
   - `find`
   - `findOne`
4. Click **Save**

## Usage

### Previewing Draft Articles

1. In Strapi admin panel, create or edit an article (keep it in draft status)
2. Click the **"Open preview"** button in the top right
3. The preview opens in an iframe showing how the article will look when published
4. Make changes in Strapi and save - the preview updates automatically

### Previewing Published Articles

1. Open a published article in Strapi
2. Click **"Open preview"** button
3. Toggle between "Draft" and "Published" tabs to compare versions

## How It Works

### Draft Mode Flow

```
Strapi Admin Panel
    ↓ (Click "Open preview")
    ↓ (Generates preview URL with secret)
Next.js /api/preview?url=/blog/article-slug&secret=xxx&status=draft
    ↓ (Validates secret)
    ↓ (Enables Draft Mode cookie)
    ↓ (Redirects to article)
/blog/[slug] page
    ↓ (Detects Draft Mode is enabled)
    ↓ (Fetches article with status=draft)
    ↓ (Displays draft content)
```

### Status Parameter

The Strapi API supports a `status` parameter:
- `status=draft` - Returns draft version
- `status=published` - Returns published version (or omit parameter)

This is handled in `src/lib/strapi-client.ts`:

```typescript
export async function getArticle(slug: string, status?: 'draft' | 'published')
```

## Troubleshooting

### Preview returns 404

**Problem**: Draft article shows 404 error

**Solutions**:
1. Check that both services are running
2. Verify `PREVIEW_SECRET` matches in both `.env` files
3. Check Strapi console logs for errors
4. Verify article has a valid `slug` field
5. Ensure article is saved in Strapi (even as draft)

### Preview button disabled

**Problem**: "Open preview" button is grayed out in Strapi

**Solutions**:
1. Save any unsaved changes in the article
2. Ensure the article has a `slug` value
3. Check Strapi console for configuration errors

### Iframe doesn't load

**Problem**: Preview iframe shows blank or security error

**Solutions**:
1. Check middleware is configured (`src/middleware.ts`)
2. Verify `NEXT_PUBLIC_CMS_URL` is correct in web `.env.local`
3. Check browser console for CSP errors
4. Ensure both apps are using `localhost` (not mix of `localhost` and `127.0.0.1`)

### Changes don't reflect in preview

**Problem**: Saving changes in Strapi doesn't update preview

**Solutions**:
1. Hard refresh the preview iframe (Ctrl/Cmd + Shift + R)
2. Check that revalidation is working (currently set to 60 seconds)
3. For immediate updates, set `cache: 'no-store'` for draft mode (already configured)

## Security Notes

1. **Preview Secret**: Change `my-secret-preview-token` to a secure random string in production
2. **CSP Headers**: The middleware only allows embedding from the configured Strapi URL
3. **Draft Content**: Draft mode uses `cache: 'no-store'` to prevent caching sensitive content

## Files Modified

- `apps/cms/config/admin.ts` - Strapi preview configuration
- `apps/cms/.env` - Preview environment variables
- `apps/web/src/app/api/preview/route.ts` - Preview API route (new)
- `apps/web/src/app/blog/[slug]/page.tsx` - Draft mode support
- `apps/web/src/lib/strapi-client.ts` - Status parameter support
- `apps/web/src/middleware.ts` - CSP headers for iframe (new)
- `apps/web/.env.local` - Preview secret (new)

## Additional Resources

- [Strapi Preview Documentation](https://docs.strapi.io/cms/features/preview)
- [Next.js Draft Mode](https://nextjs.org/docs/app/building-your-application/configuring/draft-mode)
