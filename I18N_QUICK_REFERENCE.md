# i18n Quick Reference Card

**Status:** 35% Complete | **Updated:** 2025-11-26

## 🎯 What's Working Now

✅ **Infrastructure Complete**
- Locale routing: `/en/*`, `/ar/*`, `/fr/*`
- Language switcher in header (🇬🇧 🇸🇦 🇫🇷)
- RTL support for Arabic (automatic)
- Navigation fully translated
- Locale persistence via cookies

## 🚀 Quick Start: Add Translation to Component

```typescript
// 1. Import hook
import { useTranslations } from 'next-intl';

// 2. Use in component
const t = useTranslations('common');

// 3. Replace text
<button>{t('login')}</button>

// 4. Add to messages/en.json, ar.json, fr.json
{
  "common": {
    "login": "Login" // or "تسجيل الدخول" for Arabic
  }
}
```

## 📦 Available Translation Namespaces

```typescript
useTranslations('common')      // login, register, home, shop, etc.
useTranslations('navigation')  // helpSupport, shopByGoals, athletes
useTranslations('products')    // addToCart, chooseOptions, outOfStock
useTranslations('cart')        // yourCart, emptyCart, proceedToCheckout
useTranslations('checkout')    // shippingAddress, placeOrder, thankYou
useTranslations('account')     // myAccount, orders, settings, security
useTranslations('errors')      // notFound, serverError, unauthorized
useTranslations('validation')  // required, email, password
```

## 🔧 Common Tasks

### Get Current Locale
```typescript
import { useLocale } from 'next-intl';
const locale = useLocale(); // 'en', 'ar', or 'fr'
```

### Switch Locale (in component)
```typescript
import { useRouter, usePathname } from 'next/navigation';

const router = useRouter();
const pathname = usePathname();

function switchLocale(newLocale: string) {
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, '/');
  router.push(`/${newLocale}${pathWithoutLocale}`);
}
```

### Use with Dynamic Content (Vendure)
```typescript
// Add languageCode to GraphQL query
const GET_PRODUCTS = gql`
  query GetProducts($languageCode: LanguageCode!) {
    products { ... }
  }
`;

const locale = useLocale();
const { data } = useQuery(GET_PRODUCTS, {
  variables: { languageCode: locale.toUpperCase() }
});
```

### Use with Strapi
```typescript
import { getArticles } from '@/lib/strapi-client';
const locale = useLocale();
const articles = await getArticles(locale);
```

## 🎨 RTL Support

Already enabled! Arabic automatically gets `dir="rtl"` in layout.

**To make component RTL-aware:**
```typescript
// Use Tailwind logical properties
ml-4  → ms-4  // margin-inline-start
mr-4  → me-4  // margin-inline-end
pl-4  → ps-4  // padding-inline-start
pr-4  → pe-4  // padding-inline-end
```

## 📝 Translation File Structure

```json
// messages/en.json
{
  "common": { ... },
  "navigation": { ... },
  "products": { ... },
  "cart": { ... },
  "checkout": { ... },
  "account": { ... },
  "errors": { ... },
  "validation": { ... }
}
```

## 🔍 Debugging

**Translations not showing?**
1. Check key exists in `messages/{locale}.json`
2. Verify `useTranslations` hook called
3. Ensure exact key match (case-sensitive)
4. Check console for next-intl errors

**Arabic shows LTR?**
- Verify `dir="rtl"` in `src/app/[locale]/layout.tsx` line 56

**Links break after switching?**
- Use relative paths, not hardcoded `/en/...`
- Links should be `/products` not `/en/products`

## 📚 Key Files

- **Progress:** `I18N_PROGRESS.md`
- **Full Guide:** `I18N_IMPLEMENTATION_GUIDE.md`
- **Strapi Setup:** `apps/cms/STRAPI_I18N_SETUP.md`
- **Translations:** `apps/web/messages/*.json`
- **Layout:** `apps/web/src/app/[locale]/layout.tsx`
- **Header:** `apps/web/src/components/Header.tsx` ✅ DONE

## ⏭️ Next Priority Tasks

1. **Products Page** (HIGH) - 4-6 hours
2. **Cart** (HIGH) - 2-3 hours
3. **Checkout** (CRITICAL) - 3-4 hours
4. **Account** - 2-3 hours
5. **Footer** - 1 hour

**Total:** ~20-30 hours remaining

## 🌍 Locale Codes

- **en** = English (GB flag 🇬🇧)
- **ar** = Arabic (SA flag 🇸🇦) - RTL
- **fr** = French (FR flag 🇫🇷)

## ✅ Testing Checklist

Per locale (en, ar, fr):
- [ ] Navigation translated
- [ ] Forms translated
- [ ] Buttons translated
- [ ] Error messages translated
- [ ] Can complete checkout
- [ ] Arabic: RTL layout correct
- [ ] Locale persists after page reload

---

**Need Help?** See `I18N_IMPLEMENTATION_GUIDE.md` for detailed examples and troubleshooting.
