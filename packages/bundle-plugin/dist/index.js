"use strict";
/**
 * Bundle Plugin - Exploded Bundles for Impact Nutrition
 *
 * Implements bundles as single visible lines with hidden component children
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleManager = exports.BundlePlugin = exports.BundleManager = void 0;
const plugin_system_1 = require("@impact/plugin-system");
const ui_components_1 = require("./ui-components");
/**
 * Generate unique ID for bundle items
 */
function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
// Mock bundle data - in production this would come from database/API
const MOCK_BUNDLES = [
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
class BundleManager {
    constructor() {
        this.bundles = new Map();
        // Initialize with mock data
        MOCK_BUNDLES.forEach(bundle => {
            this.bundles.set(bundle.id, bundle);
        });
    }
    /**
     * Get bundle by ID
     */
    getBundle(bundleId) {
        return this.bundles.get(bundleId);
    }
    /**
     * Get all enabled bundles
     */
    getEnabledBundles() {
        return Array.from(this.bundles.values()).filter(bundle => bundle.enabled);
    }
    /**
     * Detect potential bundles in cart items
     */
    detectBundleOpportunities(items) {
        const opportunities = [];
        for (const bundle of this.getEnabledBundles()) {
            const matches = [];
            const missing = [];
            // Check each bundle component against cart items
            bundle.items.forEach(bundleItem => {
                const cartMatch = items.find(cartItem => cartItem.variantId === bundleItem.variantId ||
                    cartItem.productId === bundleItem.variantId);
                if (cartMatch && cartMatch.quantity >= bundleItem.quantity) {
                    matches.push(bundleItem);
                }
                else {
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
    createBundleFromItems(bundleId, quantity = 1) {
        const bundle = this.getBundle(bundleId);
        if (!bundle)
            return null;
        const parentLineId = generateId();
        // Create parent bundle line
        const parentLine = {
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
        const childLines = bundle.items.map((item, index) => ({
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
    validateBundleStock(bundleId, requestedQuantity) {
        const bundle = this.getBundle(bundleId);
        if (!bundle) {
            return {
                isAvailable: false,
                insufficientItems: [],
                maxAvailableQuantity: 0
            };
        }
        // Mock stock data - in production this would query actual inventory
        const mockStock = {
            'whey-protein-isolate-2kg': 25,
            'whey-protein-concentrate-2kg': 30,
            'creatine-monohydrate-300g': 40,
            'bcaa-complex-400g': 15,
            'glutamine-powder-500g': 20,
            'multivitamin-90caps': 50
        };
        const insufficientItems = [];
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
exports.BundleManager = BundleManager;
// Create bundle manager instance
const bundleManager = new BundleManager();
exports.bundleManager = bundleManager;
/**
 * Bundle Plugin Implementation
 */
exports.BundlePlugin = (0, plugin_system_1.createPlugin)({
    name: 'bundle-plugin',
    version: '1.0.0',
    description: 'Exploded bundles with component stock consumption',
    enabled: true,
    ui: {
        cartSummary: ui_components_1.BundleCartSummaryComponent,
        productDetails: ui_components_1.BundleProductDetailsComponent,
        checkoutExtras: ui_components_1.BundleCheckoutExtrasComponent,
        userProfile: ui_components_1.BundleUserProfileComponent
    },
    hooks: {
        /**
         * Before cart calculation - detect bundle opportunities
         */
        beforeCartCalculation: (cart) => {
            console.log('[Bundle Plugin] Analyzing cart for bundle opportunities');
            // Detect bundle opportunities and add to cart metadata
            const opportunities = bundleManager.detectBundleOpportunities(cart.items);
            // Add bundle opportunities to cart for UI display
            cart.bundleOpportunities = opportunities;
            return cart;
        },
        /**
         * Calculate bundle discounts
         */
        calculateDiscounts: (items, cart) => {
            const discounts = [];
            // Find bundle parent lines and calculate savings
            const bundleParents = items.filter((item) => item.bundleParent);
            bundleParents.forEach((parentLine) => {
                const bundle = bundleManager.getBundle(parentLine.bundleId);
                if (!bundle)
                    return;
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
        afterCartCalculation: (cart) => {
            // Group bundle lines for better display
            const groupedLines = [];
            const processedIds = new Set();
            cart.items.forEach((item) => {
                if (processedIds.has(item.id))
                    return;
                if (item.bundleParent) {
                    // Find all child lines for this bundle
                    const childLines = cart.items.filter((child) => child.bundleChild && child.bundleParentLineId === item.id);
                    groupedLines.push({
                        type: 'bundle',
                        parent: item,
                        children: childLines,
                        bundleId: item.bundleId
                    });
                    // Mark all related lines as processed
                    processedIds.add(item.id);
                    childLines.forEach(child => processedIds.add(child.id));
                }
                else if (!item.bundleChild) {
                    // Regular item (not part of a bundle)
                    groupedLines.push({
                        type: 'regular',
                        item
                    });
                    processedIds.add(item.id);
                }
            });
            // Add grouped lines to cart for UI consumption
            cart.groupedLines = groupedLines;
            return cart;
        }
    }
});
exports.default = exports.BundlePlugin;
