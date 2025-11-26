# i18n Implementation Guide - Remaining Tasks

This guide provides detailed instructions for completing the internationalization implementation across the entire stack.

## Current Status (35% Complete)

### ✅ Completed
- **Phase 1:** Foundation Setup (Vendure, Strapi, Next.js configuration)
- **Phase 2:** Translation Infrastructure (message files, Bundle plugin Arabic translations, Strapi guide)
- **Phase 3 (Partial):** Routing structure, locale layout, Header & Navigation localization

### 🚧 In Progress
- **Phase 3:** Frontend UI string localization (remaining components)

### 📋 Remaining
- **Phase 3:** Dynamic content localization (Apollo/Strapi integration)
- **Phase 4:** Backend plugin localization (Reward Points, remaining plugins)
- **Phase 5:** Content management workflows
- **Phase 6:** Testing & QA
- **Phase 7:** Performance optimization

---

## Quick Start: Localizing a Component

### Template for Component Localization

```typescript
// Before
'use client';
import { SomeIcon } from 'lucide-react';

export default function MyComponent() {
  return (
    <div>
      <h1>Welcome to our store</h1>
      <button>Add to Cart</button>
    </div>
  );
}

// After
'use client';
import { SomeIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('common');
  const tProducts = useTranslations('products');
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button>{tProducts('addToCart')}</button>
    </div>
  );
}
```

### Steps:
1. Import `useTranslations` from 'next-intl'
2. Call `useTranslations('namespace')` at component top
3. Replace hardcoded strings with `t('key')`
4. Add translation keys to `messages/*.json` files

---

## Priority Tasks by Component

### Priority 2: Product Listing & Search ⚠️ HIGH IMPACT

**Files to update:**
- `src/app/[locale]/products/page.tsx` - Main product listing page
- `src/components/ProductCard.tsx` - Individual product cards (if exists)
- `src/components/FilterBar.tsx` - Filters sidebar (if exists)
- `src/components/SortDropdown.tsx` - Sort controls (if exists)

**Strings to extract:**
```json
// Add to messages/en.json under "products" namespace
{
  "products": {
    "addToCart": "Add to Cart",
    "chooseOptions": "Choose Options",
    "outOfStock": "Out of Stock",
    "loadMore": "Load More",
    "clearFilters": "Clear All Filters",
    "clearFilter": "Clear",
    "noResults": "No products found",
    "showing": "Showing {count} products",
    "sortBy": "Sort By",
    "sortNameAsc": "Name: A-Z",
    "sortNameDesc": "Name: Z-A",
    "sortPriceLow": "Price: Low to High",
    "sortPriceHigh": "Price: High to Low",
    "filters": "Filters",
    "priceRange": "Price Range",
    "inStock": "In Stock",
    "availability": "Availability"
  }
}
```

**Example: Localize ProductCard button**
```typescript
// In ProductCard component
const tProducts = useTranslations('products');

// Replace
<button>Add to Cart</button>

// With
<button>{tProducts('addToCart')}</button>
```

---

### Priority 3: Shopping Cart 🛒 HIGH IMPACT

**Files to update:**
- `src/components/CartDrawer.tsx`
- `src/app/[locale]/cart/page.tsx`
- `src/components/MiniCart.tsx` (if exists)
- `src/components/ConfirmationModal.tsx`

**Translation keys needed:**
```json
{
  "cart": {
    "yourCart": "Your Cart",
    "emptyCart": "Your cart is empty",
    "emptyCartMessage": "Add items to get started",
    "continueShopping": "Continue Shopping",
    "subtotal": "Subtotal",
    "total": "Total",
    "tax": "Tax",
    "shipping": "Shipping",
    "removeItem": "Remove Item",
    "removeItemConfirm": "Are you sure you want to remove this item?",
    "updateQuantity": "Update Quantity",
    "quantity": "Quantity",
    "proceedToCheckout": "Proceed to Checkout",
    "clearCart": "Clear Cart",
    "clearCartConfirm": "Are you sure you want to clear your cart?",
    "itemAdded": "Item added to cart",
    "itemRemoved": "Item removed from cart"
  }
}
```

---

### Priority 4: Checkout Flow 💳 CRITICAL

**Files to update:**
- `src/app/[locale]/checkout/page.tsx`
- Checkout step components (shipping, payment, review)
- `src/app/[locale]/thank-you/page.tsx`

**Translation keys:**
```json
{
  "checkout": {
    "checkout": "Checkout",
    "shippingAddress": "Shipping Address",
    "billingAddress": "Billing Address",
    "sameAsShipping": "Same as shipping address",
    "paymentMethod": "Payment Method",
    "orderSummary": "Order Summary",
    "placeOrder": "Place Order",
    "orderConfirmation": "Order Confirmation",
    "thankYou": "Thank you for your order!",
    "orderNumber": "Order Number",
    "orderDate": "Order Date",
    "estimatedDelivery": "Estimated Delivery",
    "trackOrder": "Track Order",
    "continueShoppingAfterOrder": "Continue Shopping",
    "firstName": "First Name",
    "lastName": "Last Name",
    "email": "Email",
    "phone": "Phone",
    "address": "Address",
    "city": "City",
    "postalCode": "Postal Code",
    "country": "Country",
    "state": "State/Province",
    "saveAddress": "Save this address",
    "shippingMethod": "Shipping Method",
    "freeShipping": "Free Shipping",
    "expressShipping": "Express Shipping",
    "standardShipping": "Standard Shipping"
  }
}
```

---

### Priority 5: Account Pages 👤

**Files to update:**
- `src/app/[locale]/account/page.tsx`
- `src/app/[locale]/account/orders/page.tsx`
- `src/app/[locale]/account/orders/[code]/page.tsx`
- `src/app/[locale]/account/settings/page.tsx`
- `src/app/[locale]/login/page.tsx`
- `src/app/[locale]/register/page.tsx`

**Already in translations:** Most account strings exist, just need component updates

**Additional keys needed:**
```json
{
  "account": {
    "orderDetails": "Order Details",
    "orderStatus": "Order Status",
    "orderPlaced": "Order Placed",
    "processing": "Processing",
    "shipped": "Shipped",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    "viewDetails": "View Details",
    "reorder": "Reorder",
    "downloadInvoice": "Download Invoice",
    "contactSupport": "Contact Support"
  }
}
```

---

### Priority 6: Footer 🦶

**Files to update:**
- `src/components/Footer.tsx` (if exists)
- Or footer section in layout

**Translation keys:**
```json
{
  "footer": {
    "aboutUs": "About Us",
    "contactUs": "Contact Us",
    "termsOfService": "Terms of Service",
    "privacyPolicy": "Privacy Policy",
    "shippingPolicy": "Shipping Policy",
    "returnPolicy": "Return Policy",
    "faq": "FAQ",
    "newsletter": "Newsletter",
    "subscribeNewsletter": "Subscribe to our newsletter",
    "emailPlaceholder": "Enter your email",
    "subscribe": "Subscribe",
    "followUs": "Follow Us",
    "allRightsReserved": "All rights reserved",
    "customerService": "Customer Service",
    "quickLinks": "Quick Links",
    "legal": "Legal"
  }
}
```

---

## Dynamic Content Localization (Step 3.2)

### Apollo Client Integration

**1. Create locale-aware Apollo hook:**

```typescript
// src/lib/hooks/useLocaleApollo.ts
import { useLocale } from 'next-intl';
import { useQuery, QueryHookOptions } from '@apollo/client';

export function useLocaleQuery<TData, TVariables>(
  query: any,
  options?: QueryHookOptions<TData, TVariables>
) {
  const locale = useLocale();
  
  return useQuery<TData, TVariables>(query, {
    ...options,
    variables: {
      ...options?.variables,
      languageCode: locale.toUpperCase() as any, // EN, AR, FR
    },
  });
}
```

**2. Update GraphQL queries to accept languageCode:**

```typescript
// Example: Product query
const GET_PRODUCTS = gql`
  query GetProducts($languageCode: LanguageCode!) {
    products(options: { take: 20 }) {
      items {
        id
        name
        description
        translations {
          languageCode
          name
          description
        }
      }
    }
  }
`;

// Usage in component
const { data, loading } = useLocaleQuery(GET_PRODUCTS);
```

**3. Extract localized field helper:**

```typescript
// src/lib/utils/i18n-helpers.ts
import { useLocale } from 'next-intl';

export function getLocalizedField<T extends { translations?: any[] }>(
  item: T,
  field: string,
  locale?: string
): string {
  const currentLocale = locale || useLocale();
  
  // Try to find translation for current locale
  const translation = item.translations?.find(
    (t: any) => t.languageCode?.toLowerCase() === currentLocale
  );
  
  if (translation && translation[field]) {
    return translation[field];
  }
  
  // Fallback to default field
  return (item as any)[field] || '';
}

// Usage
const productName = getLocalizedField(product, 'name');
const productDescription = getLocalizedField(product, 'description');
```

### Strapi API Integration

**1. Update strapi-client.ts:**

```typescript
// src/lib/strapi-client.ts
import { useLocale } from 'next-intl';

const STRAPI_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:1337';

export async function getArticles(locale: string = 'en') {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/articles?locale=${locale}&populate=*`
    );
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    return { data: [] };
  }
}

export async function getArticle(slug: string, locale: string = 'en') {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/articles?filters[slug][$eq]=${slug}&locale=${locale}&populate=*`
    );
    const data = await response.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.error('Failed to fetch article:', error);
    return null;
  }
}
```

**2. Update blog pages to use locale:**

```typescript
// src/app/[locale]/blog/page.tsx
import { getArticles } from '@/lib/strapi-client';
import { useLocale } from 'next-intl';

export default async function BlogPage() {
  const locale = useLocale();
  const articles = await getArticles(locale);
  
  return (
    <div>
      {articles.data.map((article: any) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}
```

---

## RTL Support (Step 3.3)

### Tailwind Logical Properties

**Replace directional utilities with logical properties:**

```css
/* Old (LTR-only) */
ml-4    /* margin-left */
mr-4    /* margin-right */
pl-4    /* padding-left */
pr-4    /* padding-right */
left-0  /* position left */
right-0 /* position right */

/* New (RTL-aware) */
ms-4    /* margin-inline-start */
me-4    /* margin-inline-end */
ps-4    /* padding-inline-start */
pe-4    /* padding-inline-end */
start-0 /* position start */
end-0   /* position end */
```

**Find and replace across codebase:**
```bash
# From project root
cd /home/hazem/testing/impact-vnext/apps/web

# Find all occurrences
grep -r "ml-\|mr-\|pl-\|pr-" src/

# Replace manually or use sed (be careful!)
# This is a manual process - review each file
```

### Custom CSS for RTL

```css
/* src/app/globals.css */

/* Flip gradients for RTL */
[dir="rtl"] .nav-gradient-wave {
  background: linear-gradient(90deg, ...); /* reversed direction */
}

/* Mirror icons */
[dir="rtl"] .icon-arrow-right {
  transform: scaleX(-1);
}

/* Adjust animations */
[dir="rtl"] .slide-in-right {
  animation: slide-in-left 0.3s ease;
}
```

---

## Testing Checklist

### Manual Testing Per Locale

**For each locale (en, ar, fr):**

1. **Navigation**
   - [ ] All menu items translated
   - [ ] Language switcher works
   - [ ] Links navigate correctly
   - [ ] Breadcrumbs show correct language

2. **Product Listing**
   - [ ] Product names in correct language
   - [ ] Filters translated
   - [ ] Sort options translated
   - [ ] "Add to Cart" button translated

3. **Cart & Checkout**
   - [ ] Cart items display correctly
   - [ ] Checkout steps translated
   - [ ] Form labels translated
   - [ ] Validation errors in correct language
   - [ ] Order confirmation translated

4. **Account**
   - [ ] Login/Register forms translated
   - [ ] Account dashboard translated
   - [ ] Order history translated
   - [ ] Settings page translated

5. **RTL Testing (Arabic only)**
   - [ ] Text aligns right
   - [ ] Layout mirrors correctly
   - [ ] Dropdowns open from correct side
   - [ ] Icons face correct direction
   - [ ] Forms align properly

---

## Quick Wins (High Impact, Low Effort)

### 1. Add More Navigation Translations (5 min)
Update announcement bar, help links, etc.

### 2. Localize Button Component (10 min)
If you have a shared Button component, add translation support once.

### 3. Add Error Messages (15 min)
Centralize error handling with translated messages.

### 4. Localize Loading States (5 min)
Replace "Loading..." with translated version.

---

## Production Readiness Checklist

Before going live with i18n:

### Must Have
- [x] Routing structure (`/en`, `/ar`, `/fr`)
- [x] Language switcher in header
- [x] RTL support for Arabic
- [ ] All user-facing strings translated (navigation, buttons, labels)
- [ ] Checkout flow fully translated
- [ ] Error messages translated
- [ ] Email templates localized
- [ ] At least 10 products translated in Vendure
- [ ] At least 3 blog articles in each language (Strapi)

### Nice to Have
- [ ] SEO metadata per locale
- [ ] `hreflang` tags
- [ ] Locale-specific sitemaps
- [ ] Analytics tracking per locale
- [ ] A/B testing per language

### Performance
- [ ] Translation files split by namespace
- [ ] Locale pages pre-rendered (SSG)
- [ ] CDN configured for locale-specific assets

---

## Troubleshooting

### Issue: Translations not showing
**Solution:** Check that:
1. Translation key exists in `messages/{locale}.json`
2. Component uses `useTranslations` hook
3. Key matches exactly (case-sensitive)
4. Locale is correctly passed to layout

### Issue: Arabic text displays but layout is LTR
**Solution:** Verify `dir="rtl"` in layout.tsx line 56

### Issue: Links break after language switch
**Solution:** Ensure all links use relative paths, not absolute with hardcoded locale

### Issue: Vendure returns English despite locale parameter
**Solution:** Check that product/collection translations exist in Vendure admin

---

## Next Steps

**Immediate (this week):**
1. Complete Priority 2 (Product Listing) - highest user impact
2. Test Arabic RTL layout
3. Add 5-10 sample product translations in Vendure

**Short-term (next week):**
1. Complete Priority 3 (Cart) and Priority 4 (Checkout)
2. Enable i18n in Strapi admin for blog content
3. Create 1-2 blog articles per language

**Medium-term (2-3 weeks):**
1. Complete all remaining UI components
2. Full RTL CSS audit and fixes
3. Performance optimization
4. User acceptance testing

---

**Last Updated:** 2025-11-26  
**Document Version:** 1.0  
**For Questions:** Refer to I18N_PROGRESS.md for detailed phase tracking
