/**
 * Bundle Plugin - Exploded Bundles for Impact Nutrition
 * 
 * Implements bundles as single visible lines with hidden component children
 */

import { createPlugin, Plugin, Cart, LineItem, Discount } from '@impact/plugin-system';
import {
  BundleCartSummaryComponent,
  BundleProductDetailsComponent,
  BundleCheckoutExtrasComponent,
  BundleUserProfileComponent
} from './ui-components';

/**
 * Generate unique ID for bundle items
 */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Bundle-specific types
export interface Bundle {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  assets: string[]; // Image URLs
  price: number; // Net price
  enabled: boolean;
  items: BundleItem[];
  category?: string;
  tags?: string[];
}

export interface BundleItem {
  variantId: string; // ProductVariant FK
  productName: string;
  variantName?: string;
  quantity: number; // Quantity per bundle
  unitPrice: number; // Individual component price
  displayOrder?: number;
}

export interface BundleLineItem extends LineItem {
  bundleParent?: boolean;
  bundleId?: string;
  bundleChild?: boolean;
  bundleParentLineId?: string;
  originalPrice?: number; // Store original price for transparency
}

// Mock bundle data - in production this would come from database/API
const MOCK_BUNDLES: Bundle[] = [
  {
    id: 'bundle-performance-stack',
    name: 'Performance Stack',
    description: 'Complete pre/post workout nutrition stack',
    assets: ['/bundles/performance-stack.jpg'],
    price: 89.97,
    enabled: true,
    category: 'stacks',
    tags: ['protein', 'creatine', 'bcaa', 'performance'],
    items: [
      {
        variantId: 'whey-protein-isolate-2kg',
        productName: 'Whey Protein Isolate',
        variantName: '2kg Vanilla',
        quantity: 1,
        unitPrice: 39.99,
        displayOrder: 1
      },
      {
        variantId: 'creatine-monohydrate-300g',
        productName: 'Creatine Monohydrate',
        variantName: '300g Unflavored',
        quantity: 1,
        unitPrice: 29.99,
        displayOrder: 2
      },
      {
        variantId: 'bcaa-complex-400g',
        productName: 'BCAA Complex',
        variantName: '400g Fruit Punch',
        quantity: 1,
        unitPrice: 24.99,
        displayOrder: 3
      }
    ]
  },
  {
    id: 'bundle-lean-muscle',
    name: 'Lean Muscle Builder',
    description: 'Optimized for lean muscle gain and recovery',
    assets: ['/bundles/lean-muscle.jpg'],
    price: 79.97,
    enabled: true,
    category: 'stacks',
    tags: ['protein', 'glutamine', 'vitamins', 'muscle-gain'],
    items: [
      {
        variantId: 'whey-protein-concentrate-2kg',
        productName: 'Whey Protein Concentrate',
        variantName: '2kg Chocolate',
        quantity: 1,
        unitPrice: 34.99,
        displayOrder: 1
      },
      {
        variantId: 'glutamine-powder-500g',
        productName: 'L-Glutamine Powder',
        variantName: '500g Unflavored',
        quantity: 1,
        unitPrice: 24.99,
        displayOrder: 2
      },
      {
        variantId: 'multivitamin-90caps',
        productName: 'Sports Multivitamin',
        variantName: '90 Capsules',
        quantity: 1,
        unitPrice: 19.99,
        displayOrder: 3
      }
    ]
  }
];

/**
 * Bundle detection and processing utilities
 */
export class BundleManager {
  private bundles: Map<string, Bundle> = new Map();

  constructor() {
    // Initialize with mock data
    MOCK_BUNDLES.forEach(bundle => {
      this.bundles.set(bundle.id, bundle);
    });
  }

  /**
   * Get bundle by ID
   */
  getBundle(bundleId: string): Bundle | undefined {
    return this.bundles.get(bundleId);
  }

  /**
   * Get all enabled bundles
   */
  getEnabledBundles(): Bundle[] {
    return Array.from(this.bundles.values()).filter(bundle => bundle.enabled);
  }

  /**
   * Detect potential bundles in cart items
   */
  detectBundleOpportunities(items: LineItem[]): Array<{
    bundle: Bundle;
    matches: BundleItem[];
    missing: BundleItem[];
    canComplete: boolean;
    potentialSavings: number;
  }> {
    const opportunities: Array<{
      bundle: Bundle;
      matches: BundleItem[];
      missing: BundleItem[];
      canComplete: boolean;
      potentialSavings: number;
    }> = [];

    for (const bundle of this.getEnabledBundles()) {
      const matches: BundleItem[] = [];
      const missing: BundleItem[] = [];

      // Check each bundle component against cart items
      bundle.items.forEach(bundleItem => {
        const cartMatch = items.find(cartItem => 
          cartItem.variantId === bundleItem.variantId || 
          cartItem.productId === bundleItem.variantId
        );

        if (cartMatch && cartMatch.quantity >= bundleItem.quantity) {
          matches.push(bundleItem);
        } else {
          missing.push(bundleItem);
        }
      });

      // Calculate potential savings
      const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
      const potentialSavings = componentTotal - bundle.price;

      if (matches.length > 0) {
        opportunities.push({
          bundle,
          matches,
          missing,
          canComplete: missing.length === 0,
          potentialSavings
        });
      }
    }

    return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  /**
   * Convert cart items to bundle + components
   */
  createBundleFromItems(bundleId: string, quantity: number = 1): {
    parentLine: BundleLineItem;
    childLines: BundleLineItem[];
  } | null {
    const bundle = this.getBundle(bundleId);
    if (!bundle) return null;

    const parentLineId = generateId();

    // Create parent bundle line
    const parentLine: BundleLineItem = {
      id: parentLineId,
      productId: bundleId,
      productName: bundle.name,
      variantId: bundleId,
      quantity,
      unitPrice: bundle.price,
      totalPrice: bundle.price * quantity,
      discountAmount: 0,
      bundleParent: true,
      bundleId: bundleId
    };

    // Create child component lines
    const childLines: BundleLineItem[] = bundle.items.map((item, index) => ({
      id: generateId(),
      productId: item.variantId,
      productName: item.productName,
      variantId: item.variantId,
      variantName: item.variantName,
      quantity: item.quantity * quantity,
      unitPrice: 0, // Zero-priced for children
      totalPrice: 0,
      discountAmount: 0,
      originalPrice: item.unitPrice, // Store original price
      bundleChild: true,
      bundleParentLineId: parentLineId,
      bundleId: bundleId
    }));

    return { parentLine, childLines };
  }

  /**
   * Validate bundle stock availability
   */
  validateBundleStock(bundleId: string, requestedQuantity: number): {
    isAvailable: boolean;
    insufficientItems: Array<{
      variantId: string;
      productName: string;
      required: number;
      available: number;
      shortfall: number;
    }>;
    maxAvailableQuantity: number;
  } {
    const bundle = this.getBundle(bundleId);
    if (!bundle) {
      return {
        isAvailable: false,
        insufficientItems: [],
        maxAvailableQuantity: 0
      };
    }

    // Mock stock data - in production this would query actual inventory
    const mockStock: Record<string, number> = {
      'whey-protein-isolate-2kg': 25,
      'whey-protein-concentrate-2kg': 30,
      'creatine-monohydrate-300g': 40,
      'bcaa-complex-400g': 15,
      'glutamine-powder-500g': 20,
      'multivitamin-90caps': 50
    };

    const insufficientItems: Array<{
      variantId: string;
      productName: string;
      required: number;
      available: number;
      shortfall: number;
    }> = [];

    let maxAvailableQuantity = Infinity;

    bundle.items.forEach(item => {
      const required = item.quantity * requestedQuantity;
      const available = mockStock[item.variantId] || 0;
      
      if (available < required) {
        insufficientItems.push({
          variantId: item.variantId,
          productName: item.productName,
          required,
          available,
          shortfall: required - available
        });
      }

      // Calculate max possible quantity for this component
      const maxForThisItem = Math.floor(available / item.quantity);
      maxAvailableQuantity = Math.min(maxAvailableQuantity, maxForThisItem);
    });

    return {
      isAvailable: insufficientItems.length === 0,
      insufficientItems,
      maxAvailableQuantity: maxAvailableQuantity === Infinity ? 0 : maxAvailableQuantity
    };
  }
}

// Create bundle manager instance
const bundleManager = new BundleManager();

/**
 * Bundle Plugin Implementation
 */
export const BundlePlugin: Plugin = createPlugin({
  name: 'bundle-plugin',
  version: '1.0.0',
  description: 'Exploded bundles with component stock consumption',
  enabled: true,
  
  ui: {
    cartSummary: BundleCartSummaryComponent,
    productDetails: BundleProductDetailsComponent,
    checkoutExtras: BundleCheckoutExtrasComponent,
    userProfile: BundleUserProfileComponent
  },
  
  hooks: {
    /**
     * Before cart calculation - detect bundle opportunities
     */
    beforeCartCalculation: (cart: Cart) => {
      console.log('[Bundle Plugin] Analyzing cart for bundle opportunities');
      
      // Detect bundle opportunities and add to cart metadata
      const opportunities = bundleManager.detectBundleOpportunities(cart.items);
      
      // Add bundle opportunities to cart for UI display
      (cart as any).bundleOpportunities = opportunities;
      
      return cart;
    },

    /**
     * Calculate bundle discounts
     */
    calculateDiscounts: (items: LineItem[], cart: Cart): Discount[] => {
      const discounts: Discount[] = [];
      
      // Find bundle parent lines and calculate savings
      const bundleParents = items.filter((item: any) => item.bundleParent);
      
      bundleParents.forEach((parentLine: any) => {
        const bundle = bundleManager.getBundle(parentLine.bundleId);
        if (!bundle) return;

        // Calculate savings vs individual component prices
        const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
        const bundlePrice = bundle.price;
        const savings = (componentTotal - bundlePrice) * parentLine.quantity;

        if (savings > 0) {
          discounts.push({
            id: `bundle-discount-${parentLine.bundleId}`,
            name: `${bundle.name} Bundle Savings`,
            type: 'fixed',
            amount: savings,
            applicableItems: [parentLine.id],
            description: `Save $${savings.toFixed(2)} with ${bundle.name} bundle`
          });
        }
      });

      console.log(`[Bundle Plugin] Generated ${discounts.length} bundle discounts`);
      return discounts;
    },

    /**
     * After cart calculation - finalize bundle display
     */
    afterCartCalculation: (cart: Cart) => {
      // Group bundle lines for better display
      const groupedLines: any[] = [];
      const processedIds = new Set<string>();

      cart.items.forEach((item: any) => {
        if (processedIds.has(item.id)) return;

        if (item.bundleParent) {
          // Find all child lines for this bundle
          const childLines = cart.items.filter((child: any) => 
            child.bundleChild && child.bundleParentLineId === item.id
          );

          groupedLines.push({
            type: 'bundle',
            parent: item,
            children: childLines,
            bundleId: item.bundleId
          });

          // Mark all related lines as processed
          processedIds.add(item.id);
          childLines.forEach(child => processedIds.add(child.id));
          
        } else if (!item.bundleChild) {
          // Regular item (not part of a bundle)
          groupedLines.push({
            type: 'regular',
            item
          });
          processedIds.add(item.id);
        }
      });

      // Add grouped lines to cart for UI consumption
      (cart as any).groupedLines = groupedLines;
      
      return cart;
    }
  }
});

// Export utilities for use in components
export { bundleManager };
export default BundlePlugin;
