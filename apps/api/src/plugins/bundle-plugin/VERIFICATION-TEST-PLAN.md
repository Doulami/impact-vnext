# Bundle Plugin v2 - Verification Test Plan

## Setup Phase

### 1. Server Startup & Database Cleanup
**Action**: Start the Vendure server and clean old data
```bash
# 1. Start server
npm run dev

# 2. Connect to database and run cleanup
# (You'll run the SQL from cleanup-old-bundle-data.sql)
```

**Expected**: 
- Server starts without errors
- Migrations run successfully  
- Old bundle product data is cleaned up
- Bundle Plugin v2 entities exist

### 2. Admin UI Access
**Action**: Access Admin UI and check Bundle plugin
```
http://localhost:3000/admin
```

**Verify**:
- Bundle management is available in admin navigation
- System → Jobs shows bundle job queues
- No console errors

---

## Core Functionality Tests

### Test 1: Bundle Creation (Admin UI)
**Scenario**: Create a basic bundle with 2 components

**Steps**:
1. Navigate to Bundles in Admin UI
2. Click "Create Bundle"
3. Fill in:
   - Name: "Test Bundle"
   - Discount Type: "percent" 
   - Percent Off: 20
4. Add 2 product variants with quantities
5. Save bundle

**Expected**:
- Bundle saves successfully 
- Status = "DRAFT"
- Bundle appears in bundle list
- Bundle details show correct components

### Test 2: Bundle Publishing & Lifecycle
**Steps**:
1. Find the draft bundle from Test 1
2. Click "Publish Bundle"
3. Verify status changes to "ACTIVE"
4. Check version increments to 1

**Expected**:
- Bundle status: DRAFT → ACTIVE
- Version: 0 → 1
- Bundle is now available for purchase

### Test 3: Shop API Queries
**Action**: Test GraphQL queries from shop API
```graphql
query GetBundles {
  bundles {
    items {
      id
      name
      status
      discountType
      percentOff
      items {
        id
        quantity
        productVariant {
          id
          name
          price
        }
      }
      price
      effectivePrice
      totalSavings
      isAvailable
    }
  }
}

query GetBundle {
  bundle(id: "BUNDLE_ID_HERE") {
    id
    name
    status
    price
    effectivePrice
    totalSavings
    isAvailable
  }
}
```

**Expected**:
- Bundles query returns active bundles
- Bundle query returns correct bundle details
- Pricing calculations are correct
- Availability is calculated properly

---

## Cart & Order Tests

### Test 4: Add Bundle to Cart
**Action**: Use addBundleToOrder mutation
```graphql
mutation AddBundle {
  addBundleToOrder(bundleId: "BUNDLE_ID", quantity: 1) {
    id
    code
    lines {
      id
      productVariant {
        name
      }
      unitPrice
      quantity
      customFields {
        bundleKey
        bundleId
        bundleName
        isBundleHeader
      }
    }
  }
}
```

**Expected**:
- Bundle is added successfully
- Order contains header line (unitPrice: 0, isBundleHeader: true)
- Order contains component lines with correct pricing
- All lines have same bundleKey
- Component lines show bundle adjustments

### Test 5: Bundle Pricing Verification
**For percent bundle (20% off)**:
- Component A: $100, qty 1 → effective price $80
- Component B: $50, qty 2 → effective price $40 each
- Total savings: $60 (20% of $300)

**For fixed price bundle**:
- Components total $300, fixed price $250
- Savings prorated across components
- Rounding handled correctly

**Verification**: Check `bundlePctApplied`, `bundleAdjAmount`, `effectiveUnitPrice` on order lines

### Test 6: Bundle Quantity Adjustment
**Action**: Use adjustBundleInOrder mutation
```graphql
mutation AdjustBundle {
  adjustBundleInOrder(bundleKey: "BUNDLE_KEY", quantity: 3) {
    lines {
      quantity
      unitPrice
      customFields {
        bundleKey
        bundleComponentQty
      }
    }
  }
}
```

**Expected**:
- All bundle lines update proportionally
- Pricing remains consistent
- bundleComponentQty updates correctly

### Test 7: Bundle Removal
**Action**: Use removeBundleFromOrder mutation
```graphql
mutation RemoveBundle {
  removeBundleFromOrder(bundleKey: "BUNDLE_KEY") {
    lines {
      id
    }
  }
}
```

**Expected**:
- All lines with matching bundleKey are removed
- Order total updates correctly

---

## Safety & Error Handling Tests

### Test 8: Stock Validation
**Setup**: Create bundle with component having limited stock (e.g., 2 units)

**Action**: Try to add bundle with quantity > available stock
```graphql
mutation AddLargeBundle {
  addBundleToOrder(bundleId: "BUNDLE_ID", quantity: 5) {
    # Should fail
  }
}
```

**Expected**:
- Mutation fails with clear error message
- Error indicates which component lacks stock
- Order is not modified

### Test 9: Component Archival Safety
**Setup**: Create active bundle, then archive one component variant

**Steps**:
1. Note bundle status (should be ACTIVE)
2. Archive one of the component variants in Admin UI
3. Check bundle status after archival

**Expected**:
- Bundle status changes from ACTIVE → BROKEN
- Bundle is no longer purchasable
- Clear reason provided for broken status

### Test 10: Component Deletion Prevention
**Action**: Try to delete a variant used in an active bundle

**Expected**:
- Deletion is blocked with clear error
- Error message suggests archiving instead
- Database constraint prevents deletion

---

## Job System Tests

### Test 11: Manual Job Triggers
**Action**: Use admin GraphQL mutations
```graphql
mutation TriggerConsistencyCheck {
  triggerBundleConsistencyCheck(scope: "active") {
    jobId
    message
  }
}

mutation RecomputeBundle {
  recomputeBundle(bundleId: "BUNDLE_ID", options: {reason: "Manual test"}) {
    jobId
    message
  }
}
```

**Verification**:
1. Navigate to Admin → System → Jobs
2. Verify jobs appear with correct names
3. Check job progress and completion
4. Verify job results

### Test 12: Automated Job Scheduling
**Note**: This requires waiting or time manipulation

**Check**:
- Nightly consistency check job appears at scheduled time
- Jobs process successfully
- Results are stored and visible

---

## Promotion System Tests

### Test 13: Bundle Pricing Promotion
**Setup**: Ensure bundle pricing promotion is active

**Action**: Add bundle to cart and verify promotion application
```graphql
query CheckPromotions {
  activeOrder {
    adjustments {
      amount
      description
      type
    }
    lines {
      adjustments {
        amount
        description
        type
      }
    }
  }
}
```

**Expected**:
- Bundle component lines have `BUNDLE_PRICING` adjustments
- Adjustment amounts match stored `bundleAdjAmount`
- Total discounts are correct

### Test 14: Site-wide Promotion Guards
**Setup**: Create site-wide promotion (e.g., 10% off everything)

**Test Cases**:
1. **Default (Exclude)**: Bundle components should not get site-wide discount
2. **Allow**: Bundle components should get both bundle and site-wide discounts
3. **Bundle Override**: Individual bundle settings override global policy

**Verification**: Check order line adjustments for correct promotion application

---

## Performance & Edge Cases

### Test 15: Large Bundle Handling
**Setup**: Create bundle with 10+ components

**Actions**:
- Add to cart
- Adjust quantity multiple times  
- Remove from cart

**Verify**:
- Operations complete in reasonable time
- All components handled correctly
- No memory issues or timeouts

### Test 16: Multiple Bundles in Order
**Action**: Add 3 different bundles to same order

**Expected**:
- Each bundle has unique bundleKey
- Components don't interfere with each other
- Pricing is calculated correctly for each group

### Test 17: Rounding Accuracy
**Setup**: Create fixed-price bundle where proration creates rounding

**Verify**:
- `Σ(bundleAdjAmount) = -D` exactly (no rounding drift)
- If drift exists, it's corrected on largest component
- Metrics log any rounding corrections

---

## Admin UI Workflow Tests

### Test 18: Bundle List Management
**Actions**:
- Filter bundles by status
- Sort bundles by different columns
- Bulk operations (if implemented)

**Expected**:
- UI is responsive and functional
- Data loads correctly
- No JavaScript errors

### Test 19: Bundle Detail Editing
**Actions**:
- Edit bundle name, description, discount
- Add/remove components
- Change component quantities
- Save changes

**Expected**:
- Changes save successfully
- Version increments on publish
- Status handling is correct

### Test 20: Component Health Panel
**Expected Features**:
- Show component stock levels
- Flag archived components
- Indicate missing components
- Component availability calculation

---

## Error Scenarios & Recovery

### Test 21: Database Constraint Violations
**Scenarios**:
- Invalid bundle status
- Missing required fields
- Invalid discount percentages
- Foreign key violations

**Expected**: Clear error messages, no data corruption

### Test 22: Concurrent Operations
**Setup**: Multiple users modifying same bundle

**Test**: Concurrent editing, publishing, cart operations

**Expected**: Proper locking, no race conditions

### Test 23: Partial Failures
**Scenarios**:
- Job processing failures
- Database connection issues
- Component unavailability during purchase

**Expected**: Graceful degradation, clear error messages

---

## Metrics & Monitoring (If Phase 4.4 implemented)

### Test 24: Job Queue Monitoring
**Verify**:
- System → Jobs shows bundle queues
- Job progress is visible
- Failed jobs can be retried
- Queue statistics are accurate

### Test 25: Bundle Operations Metrics
**Check** (if metrics endpoint exists):
- Bundle add/adjust/remove counters
- Latency histograms
- Error rates
- Rounding drift detection

---

## Final Verification Checklist

### ✅ Core Functionality
- [ ] Bundle CRUD operations work
- [ ] Cart operations (add/adjust/remove) work
- [ ] Pricing calculations are correct
- [ ] Stock validation prevents overselling

### ✅ Safety Systems  
- [ ] Component deletion blocked
- [ ] Bundle lifecycle management works
- [ ] Integrity validation detects issues
- [ ] Jobs system processes tasks correctly

### ✅ Admin Interface
- [ ] Bundle management UI functional
- [ ] Job monitoring visible in System → Jobs
- [ ] No console errors or broken links

### ✅ API Compatibility
- [ ] GraphQL schema is valid
- [ ] All mutations work as expected
- [ ] Query responses are correctly typed

### ✅ Production Readiness
- [ ] Error handling is comprehensive
- [ ] Performance is acceptable
- [ ] Database constraints prevent corruption
- [ ] Jobs integrate with Vendure's system

---

## Next Steps After Verification

Based on test results, prioritize:

1. **If all tests pass**: Move to Phase 4.4 (Metrics) or Phase 4.5 (CI Tests)
2. **If issues found**: Fix critical bugs before proceeding  
3. **Performance issues**: Optimize before production deployment

**Success Criteria**: Bundle Plugin v2 demonstrates all core functionality with no data integrity issues and acceptable performance.