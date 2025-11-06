/**
 * Plugin System Utility Functions
 *
 * Helper functions for creating and testing plugins
 */
import { Plugin, PluginHooks, PluginUIComponents, PluginTestCase, TestResult, Cart, Discount } from './types';
/**
 * Create a plugin with validation and helpful defaults
 */
export declare function createPlugin(config: {
    name: string;
    version: string;
    description?: string;
    enabled?: boolean;
    hooks: PluginHooks;
    ui?: PluginUIComponents;
    dependencies?: string[];
}): Plugin;
/**
 * Create a test suite for a plugin
 */
export declare function createPluginTestSuite(_plugin: Plugin, testCases: PluginTestCase[]): {
    runTests: () => Promise<TestResult[]>;
    runSingleTest: (testCase: PluginTestCase) => Promise<TestResult>;
};
/**
 * Calculate cart totals with discounts applied
 */
export declare function calculateCartTotals(cart: Cart, discounts: Discount[]): {
    subtotal: number;
    discountTotal: number;
    total: number;
};
/**
 * Validate line items for common issues
 */
export declare function validateLineItems(items: any[]): string[];
/**
 * Generate unique ID for plugins, carts, etc.
 */
export declare function generateId(): string;
/**
 * Format currency for display
 */
export declare function formatCurrency(amount: number, currency?: string): string;
/**
 * Debug helper to log plugin execution
 */
export declare function logPluginExecution(pluginName: string, hookName: string, data?: any): void;
//# sourceMappingURL=utils.d.ts.map