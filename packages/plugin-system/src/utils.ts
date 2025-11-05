/**
 * Plugin System Utility Functions
 * 
 * Helper functions for creating and testing plugins
 */

import { Plugin, PluginHooks, PluginTestCase, TestResult, Cart, Discount } from './types';
import { pluginRegistry } from './registry';

/**
 * Create a plugin with validation and helpful defaults
 */
export function createPlugin(config: {
  name: string;
  version: string;
  description?: string;
  enabled?: boolean;
  hooks: PluginHooks;
  dependencies?: string[];
}): Plugin {
  return {
    name: config.name,
    version: config.version,
    description: config.description || `Plugin: ${config.name}`,
    enabled: config.enabled !== false, // Default to true
    hooks: config.hooks,
    dependencies: config.dependencies || []
  };
}

/**
 * Create a test suite for a plugin
 */
export function createPluginTestSuite(plugin: Plugin, testCases: PluginTestCase[]): {
  runTests: () => Promise<TestResult[]>;
  runSingleTest: (testCase: PluginTestCase) => Promise<TestResult>;
} {
  return {
    runTests: async () => {
      const results: TestResult[] = [];
      
      for (const testCase of testCases) {
        const result = await runSingleTest(testCase);
        results.push(result);
      }
      
      return results;
    },
    
    runSingleTest: (testCase: PluginTestCase) => runSingleTest(testCase)
  };
}

/**
 * Run a single plugin test case
 */
async function runSingleTest(testCase: PluginTestCase): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Register plugin temporarily if not already registered
    const wasRegistered = pluginRegistry.get(testCase.plugin.name) !== undefined;
    if (!wasRegistered) {
      pluginRegistry.register(testCase.plugin);
    }

    let actualResult: any = {};
    
    // Test cart calculation hooks
    if (testCase.input.cart && testCase.expected.cart) {
      if (testCase.plugin.hooks.beforeCartCalculation) {
        const result = await testCase.plugin.hooks.beforeCartCalculation(testCase.input.cart);
        actualResult.cart = result;
      }
      
      if (testCase.plugin.hooks.afterCartCalculation) {
        const result = await testCase.plugin.hooks.afterCartCalculation(testCase.input.cart);
        actualResult.cart = result;
      }
      
      if (testCase.plugin.hooks.calculateDiscounts) {
        const discounts = await testCase.plugin.hooks.calculateDiscounts(
          testCase.input.cart.items, 
          testCase.input.cart
        );
        actualResult.discounts = discounts;
      }
    }
    
    // Test validation hooks
    if (testCase.input.cart && testCase.expected.validation && testCase.plugin.hooks.beforeCheckout) {
      const validation = await testCase.plugin.hooks.beforeCheckout(testCase.input.cart);
      actualResult.validation = validation;
    }
    
    // Clean up - unregister if we registered it
    if (!wasRegistered) {
      pluginRegistry.unregister(testCase.plugin.name);
    }
    
    // Compare results
    const passed = compareResults(actualResult, testCase.expected);
    
    return {
      testCase: testCase.name,
      passed,
      actualResult,
      expectedResult: testCase.expected,
      executionTime: Date.now() - startTime
    };
    
  } catch (error) {
    return {
      testCase: testCase.name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Compare actual results with expected results
 */
function compareResults(actual: any, expected: any): boolean {
  // Simple deep comparison - in production, you'd want a more robust solution
  try {
    return JSON.stringify(actual) === JSON.stringify(expected);
  } catch {
    return false;
  }
}

/**
 * Calculate cart totals with discounts applied
 */
export function calculateCartTotals(cart: Cart, discounts: Discount[]): {
  subtotal: number;
  discountTotal: number;
  total: number;
} {
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
  
  const discountTotal = discounts.reduce((sum, discount) => {
    if (discount.type === 'fixed') {
      return sum + discount.amount;
    } else if (discount.type === 'percentage') {
      return sum + (subtotal * discount.amount / 100);
    }
    return sum;
  }, 0);
  
  const total = Math.max(0, subtotal - discountTotal);
  
  return {
    subtotal,
    discountTotal,
    total
  };
}

/**
 * Validate line items for common issues
 */
export function validateLineItems(items: any[]): string[] {
  const errors: string[] = [];
  
  if (!Array.isArray(items)) {
    errors.push('Line items must be an array');
    return errors;
  }
  
  items.forEach((item, index) => {
    if (!item.id) {
      errors.push(`Line item at index ${index} missing id`);
    }
    
    if (!item.productId) {
      errors.push(`Line item at index ${index} missing productId`);
    }
    
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      errors.push(`Line item at index ${index} has invalid quantity`);
    }
    
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
      errors.push(`Line item at index ${index} has invalid unitPrice`);
    }
  });
  
  return errors;
}

/**
 * Generate unique ID for plugins, carts, etc.
 */
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}

/**
 * Debug helper to log plugin execution
 */
export function logPluginExecution(pluginName: string, hookName: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Plugin Debug] ${pluginName}.${hookName}`, data ? data : '');
  }
}