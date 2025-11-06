/**
 * Bundle Plugin Tests
 */

import { BundlePlugin, bundleManager, BundleManager } from './index';
import { Cart, LineItem } from '@impact/plugin-system';

describe('Bundle Plugin', () => {
  let cart: Cart;
  let mockItems: LineItem[];

  beforeEach(() => {
    // Setup mock cart with some items that could form bundles
    mockItems = [
      {
        id: 'item-1',
        productId: 'whey-protein-isolate-2kg',
        productName: 'Whey Protein Isolate',
        variantId: 'whey-protein-isolate-2kg',
        variantName: '2kg Vanilla',
        quantity: 1,
        unitPrice: 39.99,
        totalPrice: 39.99,
        discountAmount: 0
      },
      {
        id: 'item-2',
        productId: 'creatine-monohydrate-300g',
        productName: 'Creatine Monohydrate',
        variantId: 'creatine-monohydrate-300g',
        variantName: '300g Unflavored',
        quantity: 1,
        unitPrice: 29.99,
        totalPrice: 29.99,
        discountAmount: 0
      }
    ];

    cart = {
      id: 'test-cart-1',
      items: mockItems,
      discounts: [],
      subtotal: 69.98,
      discountTotal: 0,
      total: 69.98,
      pointsToEarn: 0,
      userId: 'test-user'
    };
  });

  describe('BundleManager', () => {
    test('should detect bundle opportunities', () => {
      const opportunities = bundleManager.detectBundleOpportunities(mockItems);
      
      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].bundle.name).toBe('Performance Stack');
      expect(opportunities[0].matches).toHaveLength(2);
      expect(opportunities[0].missing).toHaveLength(1); // Missing BCAA
      expect(opportunities[0].canComplete).toBe(false);
      expect(opportunities[0].potentialSavings).toBeGreaterThan(0);
    });

    test('should create bundle from items', () => {
      const result = bundleManager.createBundleFromItems('bundle-performance-stack', 1);
      
      expect(result).not.toBeNull();
      expect(result!.parentLine.bundleParent).toBe(true);
      expect(result!.parentLine.productName).toBe('Performance Stack');
      expect(result!.parentLine.totalPrice).toBe(89.97);
      
      expect(result!.childLines).toHaveLength(3);
      expect(result!.childLines[0].bundleChild).toBe(true);
      expect(result!.childLines[0].unitPrice).toBe(0); // Zero-priced children
    });

    test('should validate bundle stock', () => {
      const validation = bundleManager.validateBundleStock('bundle-performance-stack', 5);
      
      expect(validation.isAvailable).toBe(true);
      expect(validation.maxAvailableQuantity).toBeGreaterThan(0);
      
      // Test excessive quantity
      const excessValidation = bundleManager.validateBundleStock('bundle-performance-stack', 50);
      expect(excessValidation.isAvailable).toBe(false);
      expect(excessValidation.insufficientItems.length).toBeGreaterThan(0);
    });
  });

  describe('Plugin Hooks', () => {
    test('beforeCartCalculation should detect opportunities', () => {
      const result = BundlePlugin.hooks.beforeCartCalculation!(cart);
      
      expect((result as any).bundleOpportunities).toBeDefined();
      expect((result as any).bundleOpportunities.length).toBeGreaterThan(0);
    });

    test('calculateDiscounts should generate bundle discounts', () => {
      // Create a cart with bundle items
      const bundleResult = bundleManager.createBundleFromItems('bundle-performance-stack', 1);
      const bundleItems = [bundleResult!.parentLine, ...bundleResult!.childLines];
      
      const discounts = BundlePlugin.hooks.calculateDiscounts!(bundleItems, cart);
      
      expect(discounts).toHaveLength(1);
      expect(discounts[0].type).toBe('fixed');
      expect(discounts[0].amount).toBeGreaterThan(0);
      expect(discounts[0].name).toContain('Performance Stack');
    });

    test('afterCartCalculation should group bundle lines', () => {
      // Create a cart with bundle items
      const bundleResult = bundleManager.createBundleFromItems('bundle-performance-stack', 1);
      const cartWithBundle = {
        ...cart,
        items: [bundleResult!.parentLine, ...bundleResult!.childLines]
      };
      
      const result = BundlePlugin.hooks.afterCartCalculation!(cartWithBundle);
      
      expect((result as any).groupedLines).toBeDefined();
      expect((result as any).groupedLines[0].type).toBe('bundle');
      expect((result as any).groupedLines[0].parent).toBeDefined();
      expect((result as any).groupedLines[0].children).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty cart', () => {
      const emptyCart = { ...cart, items: [] };
      const result = BundlePlugin.hooks.beforeCartCalculation!(emptyCart);
      
      expect((result as any).bundleOpportunities).toHaveLength(0);
    });

    test('should handle invalid bundle ID', () => {
      const result = bundleManager.createBundleFromItems('invalid-bundle', 1);
      expect(result).toBeNull();
    });

    test('should handle zero quantity', () => {
      const validation = bundleManager.validateBundleStock('bundle-performance-stack', 0);
      expect(validation.maxAvailableQuantity).toBe(0);
    });

    test('should calculate correct savings', () => {
      const bundle = bundleManager.getBundle('bundle-performance-stack');
      const componentTotal = bundle!.items.reduce((sum, item) => sum + item.unitPrice, 0);
      const expectedSavings = componentTotal - bundle!.price;
      
      expect(expectedSavings).toBeCloseTo(4.99); // 94.97 - 89.97 = 5.01 (approximately)
    });
  });

  describe('Performance Tests', () => {
    test('should handle large cart efficiently', () => {
      const largeCart = {
        ...cart,
        items: Array.from({ length: 100 }, (_, i) => ({
          ...mockItems[0],
          id: `item-${i}`,
          variantId: `variant-${i}`
        }))
      };

      const startTime = Date.now();
      BundlePlugin.hooks.beforeCartCalculation!(largeCart);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in <100ms
    });
  });
});

describe('Bundle Plugin Integration', () => {
  test('plugin should be properly configured', () => {
    expect(BundlePlugin.name).toBe('bundle-plugin');
    expect(BundlePlugin.version).toBe('1.0.0');
    expect(BundlePlugin.enabled).toBe(true);
    expect(BundlePlugin.hooks.beforeCartCalculation).toBeDefined();
    expect(BundlePlugin.hooks.calculateDiscounts).toBeDefined();
    expect(BundlePlugin.hooks.afterCartCalculation).toBeDefined();
  });

  test('plugin should export bundle manager', () => {
    expect(bundleManager).toBeInstanceOf(BundleManager);
    expect(bundleManager.getEnabledBundles().length).toBeGreaterThan(0);
  });
});