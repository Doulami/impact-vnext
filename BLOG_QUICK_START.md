# Blog System Quick Start Guide

## ✅ Implementation Complete!

Your blog system has been fully implemented and is ready to use. Here's what was created:

### 📁 New Files Created

1. **Types & API Client**
   - `apps/web/src/lib/types/blog.ts` - TypeScript definitions
   - `apps/web/src/lib/strapi-client.ts` - Strapi API client

2. **Components**
   - `apps/web/src/components/blog/ArticleCard.tsx` - Article card for list view
   - `apps/web/src/components/blog/BlockRenderer.tsx` - Dynamic content renderer

3. **Pages**
   - `apps/web/src/app/blog/page.tsx` - Blog listing page
   - `apps/web/src/app/blog/[slug]/page.tsx` - Individual article page

4. **Navigation**
   - Updated `apps/web/src/components/Header.tsx` with BLOG link

---

## 🔧 Required Configuration (5 minutes)

### Step 1: Configure Strapi Permissions

**IMPORTANT**: Before the blog will work, you must enable public read permissions in Strapi.

1. Open Strapi Admin Panel:
   ```
   http://localhost:1337/admin
   ```

2. Log in with your admin credentials

3. Navigate to: **Settings → Users & Permissions Plugin → Roles → Public**

4. Scroll down and enable these permissions:

   **Article:**
   - ☑️ find
   - ☑️ findOne

   **Author:**
   - ☑️ find
   - ☑️ findOne

   **Category:**
   - ☑️ find
   - ☑️ findOne

5. Click **Save** in the top right

6. Test that it works:
   ```bash
   curl http://localhost:1337/api/articles?populate=*
   ```
   You should see JSON data (not a 403 error)

---

## 🚀 Testing Your Blog

### 1. Start the Development Server

```bash
cd apps/web
npm run dev
```

### 2. Visit Your Blog Pages

- **Blog List**: http://localhost:3001/blog
- **Your Article**: http://localhost:3001/blog/dynamometrie-force-de-prehension-mesurer-le-deficit-de-force-avec-l-ingrip-inbody

### 3. Check the Navigation

- Look for the **BLOG** link in the header navigation (between BUNDLES and ATHLETES)
- Click it to navigate to the blog

---

## 📝 Adding More Articles

To add more articles to your blog:

1. Go to Strapi Admin: http://localhost:1337/admin

2. Click **Content Manager** in the left sidebar

3. Select **Article** from the collection types

4. Click **Create new entry**

5. Fill in the fields:
   - **Title**: Your article title
   - **Description**: Short excerpt (max 80 chars)
   - **Slug**: Auto-generated from title (or customize)
   - **Cover**: Upload a cover image
   - **Author**: Select or create an author
   - **Category**: Select or create a category
   - **Blocks**: Add content blocks:
     - Rich Text: For paragraphs and formatted text
     - Media: For images or videos
     - Quote: For highlighted quotes
     - Slider: For image galleries

6. Click **Save** and then **Publish**

Your new article will automatically appear on the blog page!

---

## 🎨 Features

### Blog List Page (`/blog`)
- Grid layout (3 columns on desktop, 2 on tablet, 1 on mobile)
- Article cards with:
  - Cover image
  - Title
  - Description excerpt
  - Category badge
  - Author name
  - Publication date
- Hover effects and smooth transitions

### Blog Detail Page (`/blog/[slug]`)
- Hero cover image
- Article metadata (author, date, category)
- Breadcrumb navigation
- Dynamic content blocks:
  - **Rich Text**: Formatted paragraphs with HTML support
  - **Media**: Images and videos with captions
  - **Quotes**: Styled quote blocks with icon
  - **Sliders**: Image carousels with navigation
- Back to blog link

### Navigation
- BLOG link added to main header navigation
- Positioned between BUNDLES and ATHLETES
- Consistent styling with other nav items

---

## 🎯 URL Structure

- Blog home: `/blog`
- Individual articles: `/blog/{slug}`
  - Example: `/blog/dynamometrie-force-de-prehension-mesurer-le-deficit-de-force-avec-l-ingrip-inbody`

Slugs are auto-generated from article titles in Strapi.

---

## 📱 Responsive Design

The blog is fully responsive:
- **Mobile** (< 768px): Single column layout
- **Tablet** (768px - 1024px): 2-column grid
- **Desktop** (> 1024px): 3-column grid

All images, typography, and spacing adapt automatically.

---

## 🔍 SEO

Each article page includes:
- Dynamic page title: `{Article Title} - Impact Nutrition Blog`
- Meta description from article description field
- Proper semantic HTML structure
- Open Graph tags (can be extended)

---

## 🐛 Troubleshooting

### Articles not showing?
1. Check Strapi is running: http://localhost:1337
2. Verify permissions are enabled (see Configuration section)
3. Ensure at least one article is published in Strapi
4. Check browser console for errors

### Images not loading?
- Verify `NEXT_PUBLIC_CMS_URL=http://localhost:1337` in environment variables
- Check that cover images are uploaded in Strapi
- Ensure Strapi media uploads are working

### 403 Forbidden errors?
- You haven't configured Strapi permissions yet (see Step 1 above)

---

## 📚 Next Steps

Optional enhancements you can add:

1. **Search**: Add article search functionality
2. **Categories**: Create category filter pages
3. **Pagination**: Add pagination for many articles
4. **Related Articles**: Show related articles by category
5. **Comments**: Add a comment system
6. **Social Sharing**: Add share buttons
7. **Newsletter**: Add newsletter signup at bottom of articles
8. **Reading Time**: Calculate and display reading time

---

## ✨ Summary

Your blog system is **production-ready** and fully integrated with your Impact Nutrition website! 

The only thing you need to do is configure the Strapi permissions (Step 1 above), and you're good to go! 🎉

For detailed implementation information, see `BLOG_IMPLEMENTATION_PROGRESS.md`.
