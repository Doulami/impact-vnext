# Strapi i18n Configuration Guide

This guide provides step-by-step instructions for enabling and configuring internationalization (i18n) for Strapi 5 content types.

## Prerequisites

- Strapi 5.31.0 with i18n plugin enabled (configured in `config/plugins.ts`)
- Supported locales: English (en), Arabic (ar), French (fr)
- Default locale: English (en)

## Step 1: Access Strapi Admin Panel

1. Start Strapi CMS:
   ```bash
   cd /home/hazem/testing/impact-vnext/apps/cms
   npm run dev
   ```

2. Access the admin panel at: `http://localhost:1337/admin`

3. Log in with your admin credentials

## Step 2: Configure Locales

1. Navigate to **Settings** → **Internationalization** → **Locales**

2. Verify the following locales are added:
   - **English (en)** - Default locale ✓
   - **Arabic (ar)** - Add if not present
   - **French (fr)** - Add if not present

3. To add a locale:
   - Click **Add new locale**
   - Select the locale from the dropdown
   - Check "Set as default" only for English
   - Click **Save**

## Step 3: Enable i18n for Content Types

### Article Content Type

1. Navigate to **Content-Type Builder** → **Article**

2. Click **Edit** (pencil icon)

3. Go to the **Advanced settings** tab

4. Under **Internationalization**:
   - Enable **Enable localization for this Content-Type**
   - Click **Finish**

5. **Translatable Fields** (enable i18n for these fields):
   - `title` ✓
   - `description` ✓
   - `slug` ✓
   - `blocks` ✓ (dynamic zone)

6. **Non-Translatable Fields** (shared across locales):
   - `publishedAt` (auto-managed)
   - `cover` (image - optional: can be localized if needed)
   - `author` (relation - shared)
   - `category` (relation - shared)

### Author Content Type

1. Navigate to **Content-Type Builder** → **Author**

2. Enable **Internationalization** in Advanced settings

3. **Translatable Fields**:
   - `name` ✓
   - `bio` ✓ (if exists)

4. **Non-Translatable Fields**:
   - `avatar` (image - shared)
   - `email` (shared)

### Category Content Type

1. Navigate to **Content-Type Builder** → **Category**

2. Enable **Internationalization** in Advanced settings

3. **Translatable Fields**:
   - `name` ✓
   - `description` ✓

4. **Non-Translatable Fields**:
   - `slug` (consider: should categories have locale-specific slugs?)

### StoreConfig Content Type (Single Type)

1. Navigate to **Content-Type Builder** → **StoreConfig** (Single Type)

2. Enable **Internationalization** in Advanced settings

3. **Translatable Fields**:
   - Feature flag descriptions (if any)
   - Theme customization labels (if any)

4. **Non-Translatable Fields**:
   - Boolean feature flags (shared logic)
   - API keys and technical settings
   - Numeric thresholds

## Step 4: Migrate Existing Content

After enabling i18n for content types:

1. Go to **Content Manager**

2. For each content type (Article, Author, Category):
   - Select an existing entry
   - You'll see locale dropdown in the top-right
   - Default locale (en) is automatically assigned to existing content
   - Click **Create new locale** to add translations

### Creating Translations

**For Articles:**
1. Open an article in English
2. Click locale dropdown → **Create new locale**
3. Select Arabic (ar) or French (fr)
4. Fill in translated fields:
   - Title
   - Description
   - Slug (locale-specific)
   - Blocks content
5. Publish the translation

**Locale-Specific Slugs:**
- English: `/blog/article-about-whey-protein`
- Arabic: `/blog/مقال-عن-بروتين-مصل-الحليب`
- French: `/blog/article-sur-proteine-de-whey`

## Step 5: API Query Updates

### Fetching Localized Content

**REST API:**
```bash
# Fetch articles in Arabic
GET /api/articles?locale=ar&populate=*

# Fetch article with all localizations
GET /api/articles/1?populate=localizations
```

**GraphQL API:**
```graphql
query GetArticles($locale: I18NLocaleCode!) {
  articles(locale: $locale) {
    data {
      id
      attributes {
        title
        description
        slug
        locale
        localizations {
          data {
            id
            attributes {
              locale
            }
          }
        }
      }
    }
  }
}
```

### Fallback Strategy

If a translation doesn't exist:
1. Strapi will return empty result for that locale
2. Frontend should detect and fetch default locale (en)
3. Display language switcher showing available translations only

## Step 6: Update Frontend Integration

Update `apps/web/src/lib/strapi-client.ts`:

```typescript
export async function getArticles(locale: string = 'en') {
  const response = await fetch(
    `${STRAPI_URL}/api/articles?locale=${locale}&populate=*`
  );
  // ... handle response
}

export async function getArticle(slug: string, locale: string = 'en') {
  const response = await fetch(
    `${STRAPI_URL}/api/articles?filters[slug][$eq]=${slug}&locale=${locale}&populate=*`
  );
  // ... handle response
}
```

## Step 7: Locale Switcher UI

In blog article pages, show available translations:

```typescript
// Get available locales for an article
const availableLocales = article.attributes.localizations.data.map(
  loc => loc.attributes.locale
);

// Include current locale
availableLocales.push(article.attributes.locale);

// Display switcher for available locales only
```

## Verification Checklist

- [ ] All three locales configured in Strapi admin
- [ ] i18n enabled for Article content type
- [ ] i18n enabled for Author content type
- [ ] i18n enabled for Category content type
- [ ] i18n enabled for StoreConfig single type
- [ ] At least one article translated to all three locales
- [ ] API query with `locale=ar` returns Arabic content
- [ ] API query with `locale=fr` returns French content
- [ ] Missing translations return empty/null (not default locale)
- [ ] Frontend handles fallback to English gracefully

## Common Issues & Solutions

### Issue: Locale switcher not appearing in admin
**Solution:** Ensure i18n plugin is enabled in `config/plugins.ts` and Strapi is restarted.

### Issue: Existing content not showing locale options
**Solution:** Save the content type after enabling i18n, then refresh the content manager.

### Issue: API returns all locales instead of specific one
**Solution:** Ensure `locale` parameter is passed in the query string.

### Issue: Slug conflicts between locales
**Solution:** Make slug translatable and use locale-specific values.

## Next Steps

After completing this setup:
1. Create sample translations for testing (1 article in all 3 locales)
2. Update Next.js blog pages to fetch locale-aware content
3. Add locale switcher to blog layout
4. Test fallback behavior for missing translations
5. Document content translation workflow for content editors

---

**Configuration Status:** ✓ Plugin enabled, awaiting manual admin UI setup  
**Last Updated:** 2025-11-26
