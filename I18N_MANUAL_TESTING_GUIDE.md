# 🧪 Manual Testing Guide - Impact vNext I18N Implementation

## 🚀 Getting Started

### 1. Start the Development Environment

```bash
# From the monorepo root
cd /home/hazem/testing/impact-vnext

# Make sure Docker containers are running (default context)
docker context use default
docker ps  # Check vendure-postgres, impact-postgres, impact-redis are running

# Start Vendure API (Terminal 1)
cd apps/api
npm run dev  # Should run on http://localhost:3000

# Start Next.js Web App (Terminal 2)  
cd apps/web
npm run dev  # Should run on http://localhost:3001
```

### 2. Initial Verification
✅ **Check**: Navigate to http://localhost:3001
✅ **Expected**: Homepage loads with English content and language switcher in header

---

## 🌐 Language Switching Tests

### Test 1: Language Switcher Functionality
1. **Location**: Header (top-right area)
2. **Look for**: Globe icon with dropdown showing 🇬🇧🇸🇦🇫🇷
3. **Test Steps**:
   - Click on language switcher
   - Verify dropdown shows: English, العربية, Français
   - Click on each language
   - **Expected**: URL changes to `/en/`, `/ar/`, `/fr/`
   - **Expected**: Page content immediately translates

### Test 2: URL Structure Verification
```bash
# Test these URLs directly:
http://localhost:3001/en/           # English homepage
http://localhost:3001/ar/           # Arabic homepage (should show RTL)
http://localhost:3001/fr/           # French homepage
http://localhost:3001/en/products   # English products page
http://localhost:3001/ar/products   # Arabic products page (RTL)
http://localhost:3001/fr/products   # French products page
```

---

## 🏠 Homepage Testing

### Test 3: Homepage Translation Verification

**English (http://localhost:3001/en/)**:
- ✅ Navigation: "SHOP BY PRODUCT", "SHOP BY GOALS", "BUNDLES", "BLOG"
- ✅ Hero section: "Transform Your Fitness Journey"
- ✅ Product carousel: "Your journey starts here"
- ✅ Footer: Customer Support, About IMPACT NUTRITION sections

**Arabic (http://localhost:3001/ar/)**:
- ✅ **RTL Layout**: Text should flow right-to-left
- ✅ Navigation: "تسوق حسب المنتج", "تسوق حسب الأهداف", "الحزم", "المدونة"
- ✅ Hero section: "حوّل رحلة لياقتك البدنية"
- ✅ Currency: Prices show as "د.إ. XX.XX" (AED)
- ✅ Language switcher: Should be on the left side (RTL)

**French (http://localhost:3001/fr/)**:
- ✅ Navigation: "ACHETER PAR PRODUIT", "ACHETER PAR OBJECTIFS", "PACKS", "BLOG"
- ✅ Hero section: "Transformez votre parcours fitness"
- ✅ Currency: Prices show as "XX,XX €" (EUR)

---

## 🛍️ Product Browsing Tests

### Test 4: Products Page (/products)

**For each language (en, ar, fr)**:

1. **Navigation Test**:
   - Go to `/[locale]/products`
   - ✅ Page title translates correctly
   - ✅ Filter sidebar shows translated labels

2. **Currency Display Test**:
   - ✅ English: Prices in $XX.XX USD format
   - ✅ Arabic: Prices in د.إ. XX.XX AED format (RTL numbers)
   - ✅ French: Prices in XX,XX € EUR format

3. **Search Test**:
   - Type "protein" in search bar
   - ✅ Search placeholder text is translated
   - ✅ Results dropdown shows translated "View all results"
   - ✅ Product prices in dropdown use correct currency

4. **Filter Test**:
   - ✅ Filter labels: "Filters", "Availability", etc. are translated
   - ✅ Filter options: "All Products", "In Stock Only" translated
   - ✅ Sort dropdown: "Sort by Name", "Sort by Price" translated

---

## 🛒 Shopping Cart Tests

### Test 5: Cart Functionality

1. **Add Items to Cart**:
   - Add any product from products page
   - ✅ "Add to Cart" button text is translated
   - ✅ Success feedback in correct language

2. **Cart Dropdown (MiniCart)**:
   - Click cart icon in header
   - ✅ Cart dropdown shows translated labels
   - ✅ Prices in correct currency format
   - ✅ "View Cart" button translated

3. **Full Cart Page** (`/[locale]/cart`):
   - Navigate to cart page
   - ✅ Page title: "Shopping Cart" / "عربة التسوق" / "Panier"
   - ✅ Product prices use locale currency formatting
   - ✅ Order summary: "Subtotal", "Shipping", "Total" translated
   - ✅ Button texts: "Continue Shopping", "Proceed to Checkout" translated

---

## 📝 Checkout Process Tests

### Test 6: Complete Checkout Flow

**Test this in ALL three languages**:

1. **Step 1 - Shipping Address**:
   - Go to `/[locale]/checkout`
   - ✅ Form labels translated: "Full Name", "Street Address", etc.
   - ✅ Validation messages in correct language
   - ✅ "Continue to Delivery" button translated

2. **Step 2 - Delivery Options**:
   - ✅ Shipping method selection translated
   - ✅ "Continue to Payment" button translated

3. **Step 3 - Payment Method**:
   - ✅ Payment options translated
   - ✅ Form validation in correct language
   - ✅ "Place Order" button translated

4. **Step 4 - Order Confirmation**:
   - Complete order
   - ✅ Success message translated
   - ✅ Order details in correct currency
   - ✅ "Continue Shopping" button translated

---

## 👤 User Account Tests

### Test 7: Authentication Flow

1. **Registration** (`/[locale]/register`):
   - ✅ Form labels translated: "First Name", "Last Name", "Email"
   - ✅ Validation messages in correct language
   - ✅ "Create Account" button translated
   - ✅ Error messages for invalid inputs translated

2. **Login** (`/[locale]/login`):
   - ✅ "Sign In" form translated
   - ✅ "Welcome back" message translated
   - ✅ Error messages for failed login translated

3. **Account Dashboard** (`/[locale]/account`):
   - ✅ "Welcome back, [Name]" message translated
   - ✅ Navigation sections translated
   - ✅ Account stats (Total Orders, etc.) translated

### Test 8: Account Settings

1. **Profile Settings** (`/[locale]/account/profile`):
   - ✅ Form labels translated
   - ✅ Success message: "Profile updated successfully!" translated
   - ✅ Validation errors in correct language

2. **Security Settings** (`/[locale]/account/security`):
   - ✅ "Security Settings" title translated
   - ✅ Password form labels translated
   - ✅ Password strength indicators: "Weak", "Fair", "Strong" translated
   - ✅ Validation messages in correct language
   - ✅ Success: "Password updated successfully!" translated

3. **Order History** (`/[locale]/account/orders`):
   - ✅ "Order History" title translated
   - ✅ Search placeholder translated
   - ✅ Status filters translated
   - ✅ Order cards show:
     - Dates in locale format
     - Prices in correct currency
     - Status badges translated
   - ✅ Empty state messages translated

---

## 🎨 RTL (Arabic) Specific Tests

### Test 9: RTL Layout Verification

**Navigate to Arabic pages and verify**:

1. **Layout Direction**:
   - ✅ Text flows right-to-left
   - ✅ Navigation menu alignment is correct
   - ✅ Language switcher appears on left side
   - ✅ Form fields align properly

2. **Arabic Text Display**:
   - ✅ Arabic text renders correctly (not broken characters)
   - ✅ Numbers display as Arabic numerals where appropriate
   - ✅ Currency symbols position correctly with Arabic text

3. **Interactive Elements**:
   - ✅ Dropdown menus open in correct direction
   - ✅ Form validation messages appear in correct position
   - ✅ Buttons and links work properly

---

## 🔢 Currency & Formatting Tests

### Test 10: Locale-Specific Formatting

**Test across all pages with prices**:

1. **Currency Symbols**:
   - ✅ English: $29.99 (USD format)
   - ✅ Arabic: د.إ. ٢٩.٩٩ (AED format, Arabic numerals)
   - ✅ French: 29,99 € (EUR format, European decimals)

2. **Date Formatting**:
   - Check order dates, registration dates
   - ✅ English: "Nov 26, 2025"
   - ✅ Arabic: Appropriate Arabic date format
   - ✅ French: "26 nov. 2025"

3. **Number Formatting**:
   - Check product quantities, order counts
   - ✅ Decimal separators correct for each locale
   - ✅ Thousand separators appropriate

---

## 🧪 Advanced Testing Scenarios

### Test 11: Language Persistence

1. **Cookie Persistence**:
   - Switch to Arabic
   - Close browser
   - Reopen and navigate to site
   - ✅ Should remember Arabic language preference

2. **Cross-Page Navigation**:
   - Set language to French
   - Navigate through: Home → Products → Cart → Account
   - ✅ Language should stay French throughout

### Test 12: Edge Cases

1. **Error Handling**:
   - Try invalid login credentials in each language
   - Submit forms with missing data
   - ✅ Error messages appear in correct language

2. **Empty States**:
   - View cart when empty in each language
   - View order history with no orders
   - ✅ Empty state messages translated properly

3. **Form Validation**:
   - Submit registration with invalid email
   - Try weak passwords
   - ✅ All validation messages in correct language

---

## 🐛 Common Issues to Watch For

### Red Flags 🚩

1. **Broken Translations**:
   - Text showing as keys like `common.addToCart`
   - Mixed languages on same page
   - Missing translations showing as empty strings

2. **RTL Issues**:
   - Arabic text not aligned properly
   - Buttons or forms broken in RTL layout
   - Icons or images facing wrong direction

3. **Currency Problems**:
   - Wrong currency symbols
   - Incorrect decimal formatting
   - Mixed currencies on same page

4. **Navigation Issues**:
   - Language switcher not working
   - URLs not updating with locale
   - Broken links after language switch

---

## ✅ Success Criteria Checklist

### Core Functionality (All 3 Languages)
- [ ] Homepage loads and displays correctly
- [ ] Language switcher works (🇬🇧🇸🇦🇫🇷)
- [ ] Product browsing with correct currency
- [ ] Search functionality translated
- [ ] Shopping cart with locale formatting
- [ ] Complete checkout process
- [ ] User registration and login
- [ ] Account management pages
- [ ] Order history with status translations

### Arabic RTL Specific
- [ ] Text direction is right-to-left
- [ ] Layout elements properly aligned
- [ ] Arabic text renders correctly
- [ ] Currency shows as AED (د.إ.)

### Currency Formatting
- [ ] English: USD ($XX.XX)
- [ ] Arabic: AED (د.إ. XX.XX)
- [ ] French: EUR (XX,XX €)

### Language Persistence
- [ ] Chosen language persists across browser sessions
- [ ] URL structure maintains locale (`/en/`, `/ar/`, `/fr/`)

---

## 🚨 Reporting Issues

If you find any issues during testing:

1. **Note the exact URL** where issue occurs
2. **Record the language** you were testing
3. **Screenshot** the problem area
4. **Describe expected vs actual behavior**
5. **Test if issue occurs in other languages**

---

## 🎯 Quick Test Commands

```bash
# Quick server status check
curl http://localhost:3001/en/  # Should return English homepage
curl http://localhost:3001/ar/  # Should return Arabic homepage  
curl http://localhost:3001/fr/  # Should return French homepage

# Check API connection
curl http://localhost:3000/shop-api/  # Should return GraphQL playground
```

---

**Happy Testing! 🧪✨**

The goal is to verify that users can seamlessly shop in their preferred language with appropriate cultural formatting and layout. Every core e-commerce function should work flawlessly in English, Arabic, and French.