# Bundle Plugin v2 - Clean Documentation

## 📚 Documentation Files (Final Structure)

### 1. **verify_Bundle_Plugin_v2.md** (in `/apps/api/src/plugins/`)
   - **Purpose**: Source of truth specification
   - **Status**: Reference document
   - **Use**: Compare implementation against this spec

### 2. **BUNDLE_V2_SPEC_COMPLIANCE.md** (this folder)
   - **Purpose**: Line-by-line compliance report
   - **Status**: Accurate as of Nov 10, 2025
   - **Finding**: 65% complete (not 85%)

### 3. **V1_TO_V2_MIGRATION.md** (this folder)
   - **Purpose**: Migration guide v1 → v2
   - **Status**: Reference for schema changes

---

## 📊 Current Status: 65% Complete

### ✅ What's Working (100%)
- Data model (all v2 fields)
- Core Admin UI (bundle editor)
- Promotions system (action, condition, guard)
- ON DELETE RESTRICT constraint
- OrderLine customFields (all 11 fields)

### ⚠️ What Needs Testing
- Pricing calculations (fixed & percent)
- Event subscribers runtime
- Job queue execution
- API mutations end-to-end

### ❌ What's Missing
- Advanced Admin UI (0%)
  - Product shell inheritance
  - "Used in Bundles" panel
  - Replace wizard
  - Promotion Policy UI
- Metrics & monitoring (0%)
- Tests (0%)

---

## 🎯 Next Actions

### Priority 1: Testing (THIS WEEK)
Test via GraphQL at `http://localhost:3000/graphiql/admin`:

```graphql
# 1. Create bundle with fixed price
mutation {
  createBundle(input: {
    name: "Test Bundle"
    discountType: "fixed"
    fixedPrice: 2999
    items: [
      { productVariantId: "...", quantity: 2, unitPrice: 1000 }
      { productVariantId: "...", quantity: 1, unitPrice: 1500 }
    ]
  }) {
    id
    name
    status
  }
}

# 2. Publish bundle
mutation {
  publishBundle(id: "...") {
    success
    bundle { id status version }
  }
}

# 3. Add to order (Shop API - http://localhost:3000/graphiql/shop)
mutation {
  addBundleToOrder(bundleId: "...", quantity: 1) {
    ... on Order {
      id
      totalWithTax
      lines { id productVariant { name } quantity }
    }
    ... on ErrorResult {
      errorCode
      message
    }
  }
}

# 4. Verify pricing
# Check that bundle discount was applied correctly
```

### Priority 2: Fix Issues Found
- Document any pricing calculation errors
- Fix event subscriber issues if found
- Verify promotion guard works

### Priority 3: Optional Enhancements
- Add basic metrics (if monitoring needed)
- Write critical tests
- Build advanced Admin UI features

---

## 🚀 Production Readiness

**Current**: ⚠️ **NOT production-ready** (needs testing)  
**After Testing**: ✅ **MVP-ready** (core features work)  
**Full Production**: Needs metrics + tests (can add post-launch)

---

## 📝 Quick Reference

### Server Commands
```bash
# Start database
docker start api-postgres_db-1

# Start Vendure server
cd /home/dmiku/dev/impact-vnext/apps/api
npm run dev
```

### Access Points
- Admin GraphiQL: http://localhost:3000/graphiql/admin
- Shop GraphiQL: http://localhost:3000/graphiql/shop
- Admin UI: http://localhost:3000/admin
- Dashboard: http://localhost:3000/dashboard

### Package Manager
**Use npm** (see `/home/dmiku/dev/impact-vnext/PACKAGE_MANAGER.md`)

---

## 🔍 Compliance Summary

| Section | % Complete |
|---------|-----------|
| Data Model | 100% |
| Shop API | 90% |
| Promotions | 95-100% |
| Admin UI (Core) | 100% |
| Admin UI (Advanced) | 0% |
| Safety & Guards | 70% |
| Jobs | 75% |
| Metrics | 0% |
| Tests | 0% |
| **OVERALL** | **65%** |

---

**Clean docs. Clear status. Ready to test.** ✅
