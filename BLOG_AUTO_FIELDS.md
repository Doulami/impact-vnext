# Automatic Field Display for Blog Articles

## Overview

The blog system now automatically detects and displays **any new fields** you add to the Article content type in Strapi CMS. No code changes needed!

## How It Works

### 1. Extras Object
Any field in the Strapi Article that isn't explicitly mapped to a known property is automatically captured in the `extras` object:

```typescript
interface Article {
  // Known fields (explicitly mapped)
  title: string;
  description: string;
  longdescription: string;
  slug: string;
  coverImage: string | null;
  author: Author | null;
  category: Category | null;
  blocks: DynamicZoneBlock[];
  
  // NEW: Automatic capture of additional fields
  extras: Record<string, unknown>;
  
  publishedAt: string;
  createdAt: string;
}
```

### 2. ExtraFields Component
The `ExtraFields` component automatically renders any fields in the `extras` object with intelligent formatting based on the data type.

## Adding New Fields in Strapi

### Step 1: Add Field in Strapi
1. Go to **Content-Type Builder** in Strapi admin
2. Select **Article** content type
3. Click **Add another field**
4. Choose field type (Text, Rich text, Number, Boolean, Date, etc.)
5. Configure field settings
6. Save and restart Strapi

### Step 2: Fill in Content
1. Edit an article in **Content Manager**
2. Fill in your new field
3. Save the article

### Step 3: View on Frontend
The field will **automatically appear** in the blog detail page under "Additional Information" section!

## Supported Field Types

The `ExtraFields` component intelligently handles different data types:

### Text Fields
- **Short Text**: Displays as plain text
- **Long Text**: Displays as plain text
- **Rich Text**: Renders with HTML formatting and prose styling
- **URLs**: Automatically converted to clickable links

### Number Fields
- Displays with monospace font for clarity

### Boolean Fields
- Displays as colored badge: "Yes" (green) or "No" (gray)

### Date Fields
- Displays the ISO date string (can be formatted in future updates)

### Arrays
- Displays as bulleted list
- Each item shown on separate line

### Objects/Relations
- Displays as formatted JSON with syntax highlighting

## Example Fields You Can Add

### Reading Time
```
Field Name: readingTime
Type: Number
Description: Estimated reading time in minutes
```

Result: Displays as "Reading Time: 5"

### Tags
```
Field Name: tags
Type: Text (JSON/Array)
Description: Article tags for SEO
```

Result: Displays as bulleted list of tags

### Featured Flag
```
Field Name: featured
Type: Boolean
Description: Mark article as featured
```

Result: Displays as "Featured: Yes" with green badge

### External Link
```
Field Name: externalLink
Type: Text
Description: Link to original source
```

Result: Displays as clickable link

### Summary
```
Field Name: summary
Type: Rich Text
Description: Executive summary
```

Result: Displays with formatted HTML

### Difficulty Level
```
Field Name: difficulty
Type: Text (Enumeration)
Options: Beginner, Intermediate, Advanced
```

Result: Displays as "Difficulty Level: Intermediate"

## Display Order

Fields appear in the blog detail page in this order:

1. Breadcrumb
2. Category Badge
3. Title
4. Description
5. Meta (Date, Author preview)
6. Cover Image
7. Long Description
8. Dynamic Blocks (quotes, media, etc.)
9. **Additional Information** ← Extra fields appear here
10. Author Bio Section
11. Share Section
12. Back to Blog Link

## Field Filtering

The component automatically filters out:
- System/internal fields (starting with `_` or `__`)
- Null or undefined values
- Empty arrays
- Empty objects
- Fields already explicitly mapped (title, description, etc.)

## Customization

### Hide Specific Fields

If you want to exclude certain fields from automatic display, add them to the `knownKeys` set in `strapi-client.ts`:

```typescript
const knownKeys = new Set([
  'title',
  'description',
  // ... existing fields
  'yourFieldToHide',  // Add this
]);
```

### Custom Field Rendering

To add custom rendering for a specific field:

1. Check the field name in `ExtraFields.tsx`
2. Add a condition before the generic rendering:

```typescript
const renderValue = (value: unknown, key: string): React.ReactNode => {
  // Custom rendering for specific field
  if (key === 'readingTime') {
    return <span>{value} min read</span>;
  }
  
  // ... rest of the generic rendering
}
```

## Files Involved

1. **`apps/web/src/lib/types/blog.ts`**
   - Added `extras: Record<string, unknown>` to Article interface

2. **`apps/web/src/lib/strapi-client.ts`**
   - `transformArticle()` function captures unknown fields into extras

3. **`apps/web/src/components/blog/ExtraFields.tsx`** (NEW)
   - Component that renders extra fields intelligently

4. **`apps/web/src/app/blog/[slug]/page.tsx`**
   - Imports and uses `<ExtraFields extras={article.extras} />`

## Benefits

✅ **Zero code changes** needed when adding new fields  
✅ **Automatic formatting** based on data type  
✅ **Future-proof** - works with any new field you add  
✅ **Type-safe** - uses TypeScript for safety  
✅ **User-friendly** - formats field names nicely (camelCase → Title Case)  
✅ **Smart filtering** - only shows relevant fields  

## Testing

To test the feature:

1. Add a new field in Strapi (e.g., "readingTime" as Number)
2. Edit an article and set readingTime to 5
3. Save the article
4. View the article on the frontend
5. Scroll to "Additional Information" section
6. You should see: "Reading Time: 5"

## Limitations

- Media fields (images, files) in extras are displayed as JSON
  - Consider adding explicit mapping for important media fields
- Relation fields show raw data structure
  - Consider adding explicit mapping for important relations
- Dates are shown in ISO format
  - Can be enhanced with date formatting in future

## Future Enhancements

Potential improvements:
- Date field formatting with locale support
- Media field rendering (show thumbnails)
- Relation field rendering (show linked content)
- Collapsible sections for large extra fields
- Admin panel to configure which fields to show/hide
- Custom labels for fields (override automatic formatting)
- Field ordering control
