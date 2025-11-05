# Impact Nutrition - Plugin Architecture Specification

**Status**: Phase 2 Implementation Plan  
**Goal**: Extensible plugin system for business logic features

---

## 🎯 **Architecture Overview**

Our plugin system enables modular business features (bundles, discounts, loyalty points) to integrate seamlessly with the core shopping cart without requiring core code modifications.

### **Core Principles**
- **Feature Flag Driven**: All plugins controlled via Strapi StoreConfig
- **Event-Based**: Plugins hook into cart/user/order events
- **Non-Breaking**: Plugins can be disabled without breaking core functionality
- **Calculation Chain**: Multiple plugins can modify cart calculations
- **UI Extension**: Plugins can inject UI components

---

## 🏗️ **Plugin System Architecture**

### **1. Plugin Registry**
```typescript
// packages/plugin-system/src/registry.ts
interface Plugin {
  name: string;
  version: string;
  enabled: boolean;
  hooks: PluginHooks;
  ui?: PluginUIComponents;
}

interface PluginHooks {
  // Cart calculation hooks
  beforeCartCalculation?: (cart: Cart) => Cart;
  afterCartCalculation?: (cart: Cart) => Cart;
  
  // Line item hooks
  modifyLineItems?: (items: LineItem[]) => LineItem[];
  calculateDiscounts?: (items: LineItem[]) => Discount[];
  
  // Checkout hooks
  beforeCheckout?: (cart: Cart) => ValidationResult;
  afterCheckout?: (order: Order) => void;
  
  // User hooks
  onUserLogin?: (user: User) => void;
  onUserRegister?: (user: User) => void;
}

interface PluginUIComponents {
  cartSummary?: React.Component;
  productDetails?: React.Component;
  checkoutExtras?: React.Component;
}
```

### **2. Event System**
```typescript
// packages/plugin-system/src/events.ts
enum CartEvents {
  ITEM_ADDED = 'cart.item_added',
  ITEM_REMOVED = 'cart.item_removed',
  QUANTITY_CHANGED = 'cart.quantity_changed',
  DISCOUNT_APPLIED = 'cart.discount_applied',
  CHECKOUT_STARTED = 'cart.checkout_started'
}

enum UserEvents {
  LOGIN = 'user.login',
  REGISTER = 'user.register',
  PROFILE_UPDATED = 'user.profile_updated'
}

enum OrderEvents {
  CREATED = 'order.created',
  PAID = 'order.paid',
  SHIPPED = 'order.shipped',
  COMPLETED = 'order.completed'
}
```

### **3. Feature Flag Integration**
```typescript
// Integration with existing Strapi StoreConfig
interface StoreConfig {
  // Existing flags...
  plugins: {
    bundles: {
      enabled: boolean;
      maxBundleSize: number;
      discountType: 'percentage' | 'fixed';
    };
    discounts: {
      enabled: boolean;
      sumoEnabled: boolean;
      maxDiscountPercentage: number;
    };
    loyalty: {
      enabled: boolean;
      pointsPerDollar: number;
      redemptionRate: number;
    };
  };
}
```

---

## 📦 **Plugin Implementations**

### **Bundle Plugin**
```typescript
// packages/bundle-plugin/src/index.ts
const BundlePlugin: Plugin = {
  name: 'bundle-plugin',
  version: '1.0.0',
  enabled: true,
  
  hooks: {
    modifyLineItems: (items: LineItem[]) => {
      // Check for bundle combinations
      const bundles = detectBundles(items);
      return applyBundleDiscounts(items, bundles);
    },
    
    calculateDiscounts: (items: LineItem[]) => {
      return calculateBundleDiscounts(items);
    }
  },
  
  ui: {
    cartSummary: BundleSummaryComponent,
    productDetails: BundleSelectionComponent
  }
};

// Bundle detection logic
function detectBundles(items: LineItem[]): Bundle[] {
  // Logic to detect bundle combinations
  // e.g., Protein + Creatine + BCAA = Stack Bundle
  return bundles;
}
```

### **Discount Plugin (Sumo Integration)**
```typescript
// packages/discount-plugin/src/index.ts
const DiscountPlugin: Plugin = {
  name: 'discount-plugin',
  version: '1.0.0',
  enabled: true,
  
  hooks: {
    beforeCartCalculation: async (cart: Cart) => {
      // Check for active Sumo discounts
      const activeDiscounts = await fetchSumoDiscounts();
      cart.availableDiscounts = activeDiscounts;
      return cart;
    },
    
    calculateDiscounts: (items: LineItem[]) => {
      return applySumoDiscounts(items, cart.couponCode);
    }
  },
  
  ui: {
    cartSummary: CouponCodeComponent,
    checkoutExtras: DiscountSummaryComponent
  }
};
```

### **Loyalty Points Plugin**
```typescript
// packages/loyalty-plugin/src/index.ts
const LoyaltyPlugin: Plugin = {
  name: 'loyalty-plugin',
  version: '1.0.0',
  enabled: true,
  
  hooks: {
    afterCartCalculation: (cart: Cart) => {
      // Calculate points to be earned
      cart.pointsToEarn = calculatePointsToEarn(cart.total);
      return cart;
    },
    
    afterCheckout: async (order: Order) => {
      // Award points to user
      await awardPoints(order.userId, order.pointsToEarn);
    },
    
    onUserLogin: async (user: User) => {
      // Load user's point balance
      user.loyaltyPoints = await getUserPoints(user.id);
    }
  },
  
  ui: {
    cartSummary: PointsDisplayComponent,
    checkoutExtras: PointsRedemptionComponent
  }
};
```

---

## 🔧 **Implementation Strategy**

### **Phase 2A: Core Plugin System** (Week 5)
```bash
# Create plugin system package
mkdir packages/plugin-system
cd packages/plugin-system
npm init -y
```

**Deliverables**:
- Plugin registry and lifecycle management
- Event system with typed events
- Feature flag integration with Strapi
- Plugin hook execution pipeline

### **Phase 2B: Cart Integration** (Week 6)
**Deliverables**:
- Modify cart hook to use plugin system
- Add plugin execution points in cart calculations
- UI extension points in cart components
- Testing framework for plugins

### **Phase 3A: Individual Plugins** (Weeks 7-9)
**Week 7**: Bundle Plugin
- Bundle detection algorithms
- Bundle pricing logic
- Bundle UI components

**Week 8**: Discount Plugin
- Sumo discount API integration
- Coupon code validation
- Discount calculation engine

**Week 9**: Loyalty Plugin
- Points calculation system
- Points database schema
- Redemption workflow

---

## 🧪 **Testing Strategy**

### **Plugin Testing Framework**
```typescript
// packages/plugin-system/src/testing.ts
interface PluginTestCase {
  name: string;
  cart: Cart;
  expectedResult: Cart;
  plugin: Plugin;
}

class PluginTester {
  test(testCase: PluginTestCase) {
    // Execute plugin hooks
    // Compare results
    // Report success/failure
  }
}
```

### **A/B Testing Integration**
```typescript
// Feature flag driven A/B testing
interface ABTestConfig {
  testName: string;
  variants: {
    control: PluginConfig;
    variant: PluginConfig;
  };
  trafficSplit: number; // 0-100%
}

// Example: Test different bundle discount percentages
const bundleDiscountTest: ABTestConfig = {
  testName: 'bundle_discount_percentage',
  variants: {
    control: { bundleDiscount: 0.10 }, // 10% discount
    variant: { bundleDiscount: 0.15 }   // 15% discount
  },
  trafficSplit: 50
};
```

---

## 🚀 **Implementation Benefits**

### **Development Benefits**
- **Parallel Development**: Multiple developers can work on different plugins
- **Code Isolation**: Plugin bugs don't affect core functionality
- **Easy Testing**: Each plugin can be tested independently
- **Feature Flags**: Enable/disable features without deployments

### **Business Benefits**
- **A/B Testing**: Test different discount strategies easily
- **Rapid Deployment**: New business logic without core changes
- **Risk Mitigation**: Disable problematic features instantly
- **Performance**: Load only enabled plugins

### **Maintenance Benefits**
- **Modular Updates**: Update plugins independently
- **Clean Architecture**: Clear separation of concerns
- **Documentation**: Each plugin self-documents its functionality
- **Debugging**: Isolate issues to specific plugins

---

## 🎯 **Next Steps**

### **Immediate Actions**:
1. **Create Plugin System Package**: `packages/plugin-system`
2. **Define Plugin Interfaces**: TypeScript interfaces and types
3. **Implement Event System**: Event emitter with typed events
4. **Integrate with Cart**: Add plugin hooks to cart calculations

### **Success Criteria**:
- [ ] Plugin registration system working
- [ ] Event system emitting cart events
- [ ] Feature flags controlling plugin enablement
- [ ] First plugin (bundle) successfully modifying cart
- [ ] UI extension points functional

---

*Ready to build a scalable, extensible e-commerce platform! 🚀*