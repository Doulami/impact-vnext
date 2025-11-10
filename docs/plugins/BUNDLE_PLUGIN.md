# Bundle Plugin - Exploded Bundles for Impact Nutrition

**Status**: Implementation Phase  
**Priority**: High - Core Revenue Feature  
**Type**: Business Logic Plugin

---

## 🎯 **Overview**

The Bundle Plugin implements "exploded bundles" - selling bundles as single, visible, priced lines in cart/checkout/orders while consuming stock from component variants. Bundles have their own pricing, promotions, and assets, displaying as grouped lines with expandable children across all customer touchpoints.

### **Key Principle**: 
- **One visible parent line** (bundle product with name, images, price)
- **Hidden/grouped child lines** (component variants, zero-priced)
- **Stock consumption** only on child variants
- **Atomic operations** for all bundle modifications

---

## 🧩 **Scope & Requirements**

### **Core Functionality**
- **Visible parent line**: Bundle product (name, images, attributes, price)
- **Hidden/grouped child lines**: Component variants (no customer-facing prices)
- **Inventory management**: Reduce/increase stock on child variants only
- **Pricing strategy**: Parent carries full price; children are zero-priced
- **Promotions**: Can target bundle parent independently of child SKUs
- **Shipping calculations**: Weight/dimensions from children; parent is visual only
- **Search/Catalog**: Bundles appear as products in storefront; children remain normal products
- **Order lifecycle**: Adjust/remove/fulfill/cancel/refund on parent cascades to children

### **User Experience Goals**
- Simplified cart view with bundle as single line item
- Expandable component details for transparency
- Consistent behavior across cart, checkout, order history, emails
- Clear inventory messaging when components are unavailable

---

## 🗂 **Data Model Architecture**

### **Bundle Entity**
```typescript
interface Bundle {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  assets: string[]; // Image URLs
  price: number; // Net price (consistent with Vendure)
  enabled: boolean;
  items: BundleItem[];
  createdAt: Date;
  updatedAt: Date;
}
```

### **BundleItem Component**
```typescript
interface BundleItem {
  variantId: string; // ProductVariant FK
  quantity: number; // Quantity per bundle
  displayOrder?: number; // For UI ordering
}
```

### **OrderLine Custom Fields**
```typescript
interface OrderLineCustomFields {
  // Parent bundle line
  bundleParent?: boolean;
  bundleId?: string;
  
  // Child component line
  bundleChild?: boolean;
  bundleParentLineId?: string;
  bundleId?: string; // Same as parent for grouping
}
```

### **Optional: ProductVariant Bundle Integration**
```typescript
interface ProductVariantCustomFields {
  isBundle?: boolean;
  bundleId?: string; // If bundle lives in catalog as SKU
}
```

---

## 🧮 **Pricing & Promotions Strategy**

### **Default Pricing Model**
- **Parent line**: Holds complete bundle price
- **Child lines**: Zero-priced (default behavior)
- **Total calculation**: Bundle price × quantity

### **Dynamic Pricing Mode** (Future Enhancement)
- **Price calculation**: `sum(children) - discount`
- **Implementation**: Equal and opposite OrderLineAdjustment
- **Benefit**: Allows component-level pricing transparency

### **Promotion Integration**
```typescript
// New PromotionCondition
interface BundlePromotionCondition {
  type: 'bundle_parent';
  bundleIds?: string[]; // Target specific bundles
  minQuantity?: number;
  maxQuantity?: number;
}
```

**Promotion Rules**:
- Bundle-specific promotions target `bundleParent=true` lines
- Component-level promotions excluded from zero-priced children
- Stacking rules apply to bundle as single unit

---

## 📦 **Inventory & Availability Management**

### **Stock Validation Logic**
```typescript
interface StockValidation {
  bundleId: string;
  requestedQuantity: number;
  validation: {
    isAvailable: boolean;
    insufficientItems: Array<{
      variantId: string;
      required: number;
      available: number;
      shortfall: number;
    }>;
    maxAvailableQuantity: number;
  };
}
```

### **Stock Movement Rules**
- **Add bundle**: Validate `sum(child.quantity × bundleQty)` for all components
- **Stock changes**: Occur only on child lines (standard Vendure flow)
- **Backorder policy**: Respect per-variant policies
- **Error messaging**: Clear identification of unavailable components

---

## 🧭 **Cart/Checkout/Orders UX Specification**

### **Display Format**
```
🛍️ Cart Items (2)

Bundle: Performance Stack                           $89.97
├─ Whey Protein Isolate × 1
├─ Creatine Monohydrate × 1  
└─ BCAA Complex × 1
Quantity: [1] [+] [-]                              

Individual: Vitamin D3                              $19.99
Quantity: [1] [+] [-]
```

### **Interaction Rules**
- **Quantity controls**: Only on parent line
- **Component display**: Expandable/collapsible section
- **Removal**: Parent removal cascades to children
- **Adjustment**: Parent quantity changes recalculate all children
- **Error states**: Clear messaging for stock/availability issues

### **Responsive Behavior**
- **Mobile**: Collapsed by default, tap to expand components
- **Desktop**: Expanded by default with visual grouping
- **Email/Print**: Always expanded with clear hierarchy

---

## 🛠 **API Design**

### **Shop API Mutations**
```typescript
// Add bundle to cart
addBundleToOrder(bundleId: ID!, quantity: Int!): Order

// Adjust bundle quantity
adjustBundleInOrder(orderLineId: ID!, quantity: Int!): Order

// Remove bundle from cart
removeBundleFromOrder(orderLineId: ID!): Order

// Get bundle details for PDP
bundle(bundleId: ID!): Bundle
```

### **Mutation Behavior**
- **Atomic operations**: Create/adjust/remove parent + children together
- **Stock validation**: Pre-flight checks before committing changes
- **Error handling**: Detailed messages for stock/validation failures
- **Promotion application**: Automatic bundle-specific discount calculation

### **Query Extensions**
```typescript
type Order {
  lines: [OrderLine!]!
  bundleGroups: [BundleGroup!]! // Grouped view helper
}

type BundleGroup {
  parentLine: OrderLine!
  childLines: [OrderLine!]!
  bundle: Bundle!
}
```

---

## 🖥 **Admin Dashboard Extensions**

### **Bundle Management Interface**
- **Bundle list**: Searchable table with name, price, status, component count
- **Create/Edit form**: 
  - Basic fields (name, slug, description, price, enabled)
  - Asset management (drag-drop image upload)
  - Component picker (searchable ProductVariant multi-select)
  - Quantity per component configuration
  - Live preview of bundle composition

### **Bundle Analytics Dashboard**
- **Live computed metrics**:
  - Total component count per bundle
  - Weight/volume calculations
  - Availability status for trial quantities
  - Revenue attribution (bundle vs individual sales)

### **Order Management Integration**
- **Grouped line display**: Parent visible, children indented
- **Cascade actions**: Adjust/remove/fulfill/refund via parent controls
- **Audit trail**: Parent→child linkage tracking
- **Stock impact visualization**: Real-time component stock levels

---

## 🚚 **Fulfillment, Returns & Refunds**

### **Fulfillment Workflow**
```typescript
interface BundleFulfillment {
  parentLineId: string;
  action: 'fulfill' | 'cancel' | 'refund';
  quantity?: number; // Partial quantity changes
  cascadeToChildren: boolean; // Always true for consistency
}
```

### **Operation Rules**
- **Fulfill bundle**: Creates fulfillment for parent + proportional children
- **Cancel bundle**: Cancels parent + children, restocks component variants
- **Refund bundle**: Processes refund for bundle price, restocks components
- **Partial operations**: Blocked on individual children (must use parent)

### **Stock Management**
- **Restock on cancel/refund**: Uses normal Vendure restock rules
- **Multi-warehouse**: Document limitations for complex scenarios
- **Audit trail**: Track all stock movements with bundle context

---

## 🔎 **Search & Indexing Strategy**

### **Elasticsearch Integration**
```typescript
interface BundleSearchDocument {
  id: string;
  type: 'bundle';
  name: string;
  slug: string;
  price: number;
  assets: string[];
  tags: string[];
  facets: SearchFacet[];
  componentCount: number;
  categoryIds: string[]; // From component products
  availability: boolean;
}
```

### **Indexing Rules**
- **Bundle products**: Indexed as searchable products
- **Component visibility**: Children remain as normal products
- **Order lines**: Child lines excluded from catalog indices
- **Sorting compatibility**: Price/name/date sorting treats bundles as standard products

---

## ⚙️ **Configuration & Guards**

### **Feature Toggles**
```typescript
interface BundleConfig {
  // Pricing strategy
  pricingMode: 'fixed' | 'dynamic'; // Default: 'fixed'
  
  // UI behavior
  showComponentsByDefault: boolean; // Default: true
  allowPartialFulfillment: boolean; // Default: false
  
  // Business rules
  maxBundleSize: number; // Default: 10 components
  minBundlePrice: number; // Default: 0
  
  // Channel availability
  enabledChannels: string[];
}
```

### **Permission Guards**
- **Bundle CRUD**: Requires `CatalogAdmin` or `SuperAdmin` role
- **Order modifications**: Standard order permissions apply
- **Promotion creation**: Bundle conditions require promotion permissions

### **Validation Rules**
- **Component uniqueness**: No duplicate variants in single bundle
- **Circular references**: Prevent bundles containing other bundles
- **Price consistency**: Bundle price must be positive
- **Stock requirements**: All components must be stockable variants

---

## 🧪 **Test Plan & Acceptance Criteria**

### **Core Functionality Tests**
- ✅ **Add bundle (qty=1)**: Cart shows one priced line; expand reveals components
- ✅ **Adjust quantity (qty=3)**: Child quantities scale correctly; totals match
- ✅ **Remove bundle**: Removes all child lines atomically
- ✅ **Stock enforcement**: Insufficient component blocks add/adjust with clear error
- ✅ **Promotion application**: Bundle-specific discount applies to parent only
- ✅ **Order fulfillment**: Stock decrements from components; shipment shows bundle + items
- ✅ **Refund/Cancel**: Cascades to children; stock restored properly
- ✅ **Email generation**: Bundle line with indented components; correct totals

### **Admin Interface Tests**
- ✅ **Bundle creation**: Form validation, component picker, live preview
- ✅ **Order management**: Grouped display, cascade actions, audit trail
- ✅ **Analytics accuracy**: Component count, availability, revenue attribution

### **Edge Case Handling**
- ⚠️ **Component unavailability**: Clear error messaging, suggested alternatives
- ⚠️ **Mixed tax rates**: Document tax calculation policy on parent
- ⚠️ **Multi-warehouse shipping**: Document limitations, defer complex scenarios
- ⚠️ **Promotion conflicts**: Zero-price children don't trigger component promos

---

## 🧯 **Risk Mitigation & Edge Cases**

### **High-Risk Scenarios**
1. **Component disabled in cart**: Block checkout with clear error + removal option
2. **Stock race conditions**: Implement optimistic locking on bundle operations
3. **Partial promotions**: Ensure bundle promotions don't cascade incorrectly
4. **Tax calculation complexity**: Use parent-line tax logic, document policy

### **Performance Considerations**
- **Large bundles**: Limit component count (default: 10 items)
- **Stock queries**: Batch component availability checks
- **Order line proliferation**: Monitor database impact of child lines

### **Data Consistency Guards**
- **Orphaned children**: Background job to detect/clean orphaned bundle components
- **Price discrepancies**: Validation to ensure parent price matches business rules
- **Inventory sync**: Regular reconciliation between parent bundles and component stock

---

## 📘 **Implementation Deliverables**

### **Phase 1: Core Plugin Development**
- [ ] Bundle entity and data model
- [ ] Plugin registry integration
- [ ] Basic cart operations (add/remove/adjust)
- [ ] Stock validation and error handling
- [ ] Unit tests for all core functionality

### **Phase 2: Frontend Integration**
- [ ] Cart component modifications
- [ ] Bundle display components
- [ ] Checkout integration
- [ ] Order history/details pages
- [ ] Responsive design implementation

### **Phase 3: Advanced Features**
- [ ] Admin dashboard extensions
- [ ] Promotion condition integration
- [ ] Email template modifications
- [ ] Search/indexing implementation
- [ ] Performance optimizations

### **Phase 4: Production Readiness**
- [ ] End-to-end testing suite
- [ ] Performance testing with large catalogs
- [ ] Migration scripts for existing orders
- [ ] Documentation and training materials
- [ ] Monitoring and analytics setup

---

## ✅ **Definition of Done**

### **Technical Requirements**
- All acceptance tests pass on local + staging environments
- Performance benchmarks meet requirements (< 200ms bundle operations)
- Zero data loss scenarios under normal operation
- Graceful degradation when plugin is disabled

### **User Experience Requirements**
- Storefront cart/checkout/order pages display grouped bundles per spec
- Admin dashboard shows bundle CRUD + grouped order lines
- Email templates render bundle hierarchy correctly
- Mobile experience matches desktop functionality

### **Business Requirements**
- Bundle promotions target parents without impacting child SKUs
- Stock and shipping behave as if individual SKUs were purchased
- Revenue reporting correctly attributes bundle vs component sales
- Tax calculation follows documented business rules

---

## 🚀 **Future Enhancements**

### **Advanced Bundle Types**
- **Dynamic bundles**: AI-suggested combinations based on user behavior
- **Tiered bundles**: Multiple quantity/price tiers (bulk discounts)
- **Personalized bundles**: User-customizable component selection

### **Business Intelligence**
- **Bundle performance analytics**: Conversion rates, component popularity
- **Recommendation engine**: "Complete your stack" suggestions
- **A/B testing framework**: Bundle pricing and composition experiments

### **Integration Extensions**
- **Subscription bundles**: Recurring bundle deliveries
- **Gift bundles**: Special packaging and messaging
- **B2B bundles**: Volume pricing for business customers

---

*Ready to revolutionize sports nutrition bundling with intelligent, scalable commerce! 🚀*