"use strict";
/**
 * Plugin System Utility Functions
 *
 * Helper functions for creating and testing plugins
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlugin = createPlugin;
exports.createPluginTestSuite = createPluginTestSuite;
exports.calculateCartTotals = calculateCartTotals;
exports.validateLineItems = validateLineItems;
exports.generateId = generateId;
exports.formatCurrency = formatCurrency;
exports.logPluginExecution = logPluginExecution;
const registry_1 = require("./registry");
/**
 * Create a plugin with validation and helpful defaults
 */
function createPlugin(config) {
    return {
        name: config.name,
        version: config.version,
        description: config.description || `Plugin: ${config.name}`,
        enabled: config.enabled !== false, // Default to true
        hooks: config.hooks,
        ui: config.ui,
        dependencies: config.dependencies || []
    };
}
/**
 * Create a test suite for a plugin
 */
function createPluginTestSuite(_plugin, testCases) {
    return {
        runTests: async () => {
            const results = [];
            for (const testCase of testCases) {
                const result = await runSingleTest(testCase);
                results.push(result);
            }
            return results;
        },
        runSingleTest: (testCase) => runSingleTest(testCase)
    };
}
/**
 * Run a single plugin test case
 */
async function runSingleTest(testCase) {
    const startTime = Date.now();
    try {
        // Register plugin temporarily if not already registered
        const wasRegistered = registry_1.pluginRegistry.get(testCase.plugin.name) !== undefined;
        if (!wasRegistered) {
            registry_1.pluginRegistry.register(testCase.plugin);
        }
        let actualResult = {};
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
                const discounts = await testCase.plugin.hooks.calculateDiscounts(testCase.input.cart.items, testCase.input.cart);
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
            registry_1.pluginRegistry.unregister(testCase.plugin.name);
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
    }
    catch (error) {
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
function compareResults(actual, expected) {
    // Simple deep comparison - in production, you'd want a more robust solution
    try {
        return JSON.stringify(actual) === JSON.stringify(expected);
    }
    catch {
        return false;
    }
}
/**
 * Calculate cart totals with discounts applied
 */
function calculateCartTotals(cart, discounts) {
    const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discountTotal = discounts.reduce((sum, discount) => {
        if (discount.type === 'fixed') {
            return sum + discount.amount;
        }
        else if (discount.type === 'percentage') {
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
function validateLineItems(items) {
    const errors = [];
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
function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
/**
 * Format currency for display
 */
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(amount);
}
/**
 * Debug helper to log plugin execution
 */
function logPluginExecution(pluginName, hookName, data) {
    if (process.env.NODE_ENV === 'development') {
        console.log(`[Plugin Debug] ${pluginName}.${hookName}`, data ? data : '');
    }
}
//# sourceMappingURL=utils.js.map