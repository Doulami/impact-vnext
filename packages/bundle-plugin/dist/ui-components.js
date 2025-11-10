"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleCartSummaryComponent = BundleCartSummaryComponent;
exports.BundleProductDetailsComponent = BundleProductDetailsComponent;
exports.BundleCheckoutExtrasComponent = BundleCheckoutExtrasComponent;
exports.BundleUserProfileComponent = BundleUserProfileComponent;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const index_1 = require("./index");
/**
 * Bundle Plugin UI Components
 *
 * Implements the UI components as specified in the Bundle Plugin documentation
 * - Cart summary with bundle opportunities and savings display
 * - Product details with bundle recommendations
 * - Checkout extras with bundle validation
 */
/**
 * Bundle Cart Summary Component
 *
 * Displays in cart summary area - shows bundle opportunities and active bundle discounts
 */
function BundleCartSummaryComponent({ cart, plugin }) {
    // Get bundle opportunities from cart (added by plugin hooks)
    const opportunities = cart?.bundleOpportunities || [];
    const discounts = cart?.discounts?.filter((d) => d.id.startsWith('bundle-discount-')) || [];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-cart-summary", children: [discounts.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-savings bg-green-50 border border-green-200 rounded-lg p-3 mb-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center mb-2", children: (0, jsx_runtime_1.jsx)("span", { className: "text-green-600 font-medium text-sm", children: "\uD83C\uDF89 Bundle Savings Applied" }) }), discounts.map((discount) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-sm", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-700", children: discount.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-green-600 font-medium", children: ["-$", discount.amount.toFixed(2)] })] }, discount.id)))] })), opportunities.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-opportunities bg-blue-50 border border-blue-200 rounded-lg p-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center mb-2", children: (0, jsx_runtime_1.jsx)("span", { className: "text-blue-600 font-medium text-sm", children: "\uD83D\uDCA1 Bundle Opportunities" }) }), opportunities.slice(0, 1).map((opportunity) => ((0, jsx_runtime_1.jsxs)("div", { className: "text-sm", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-1", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-700", children: opportunity.bundle.name }), (0, jsx_runtime_1.jsxs)("span", { className: "text-green-600 font-medium", children: ["Save $", opportunity.potentialSavings.toFixed(2)] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-gray-600 mb-2", children: [opportunity.matches.length, " of ", opportunity.bundle.items.length, " items in cart"] }), opportunity.canComplete ? ((0, jsx_runtime_1.jsx)("div", { className: "text-xs text-blue-600", children: "\u2728 Ready to create bundle!" })) : ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-orange-600", children: ["Add ", opportunity.missing.length, " more items to unlock savings"] }))] }, opportunity.bundle.id))), opportunities.length > 1 && ((0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-blue-600 mt-2", children: ["+", opportunities.length - 1, " more bundle opportunities"] }))] }))] }));
}
/**
 * Bundle Product Details Component
 *
 * Displays on product pages - shows bundles this product is part of
 */
function BundleProductDetailsComponent({ product, plugin }) {
    const [showAllBundles, setShowAllBundles] = (0, react_1.useState)(false);
    // Find bundles that include this product
    const availableBundles = index_1.bundleManager.getEnabledBundles().filter(bundle => bundle.items.some(item => item.variantId === product?.variantId ||
        item.variantId === product?.id));
    if (availableBundles.length === 0)
        return null;
    const displayBundles = showAllBundles ? availableBundles : availableBundles.slice(0, 2);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-product-recommendations bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mt-4", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-lg font-semibold text-gray-900 mb-3 flex items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xl mr-2", children: "\uD83D\uDCE6" }), "Complete Your Stack"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600 mb-4", children: "This product is part of these high-performance bundles. Save money by getting the complete stack!" }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: displayBundles.map((bundle) => {
                    const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
                    const savings = componentTotal - bundle.price;
                    return ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-lg border border-gray-200 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-start mb-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-medium text-gray-900", children: bundle.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: bundle.description })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-lg font-bold text-blue-600", children: ["$", bundle.price] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-green-600", children: ["Save $", savings.toFixed(2)] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm font-medium text-gray-700 mb-1", children: "Includes:" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: bundle.items.map((item, index) => ((0, jsx_runtime_1.jsxs)("span", { className: `px-2 py-1 rounded text-xs ${item.variantId === product?.variantId || item.variantId === product?.id
                                                ? 'bg-blue-100 text-blue-700 font-medium'
                                                : 'bg-gray-100 text-gray-600'}`, children: [item.variantId === product?.variantId || item.variantId === product?.id ? '✓ ' : '', item.productName] }, index))) })] }), (0, jsx_runtime_1.jsxs)("button", { className: "w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700 transition-colors text-sm", children: ["Get Complete Bundle - Save $", savings.toFixed(2)] })] }, bundle.id));
                }) }), availableBundles.length > 2 && ((0, jsx_runtime_1.jsx)("button", { onClick: () => setShowAllBundles(!showAllBundles), className: "text-blue-600 text-sm hover:text-blue-800 mt-3 underline", children: showAllBundles
                    ? 'Show Less'
                    : `View ${availableBundles.length - 2} More Bundles` }))] }));
}
/**
 * Bundle Checkout Extras Component
 *
 * Displays during checkout - validation messages and last-chance bundle offers
 */
function BundleCheckoutExtrasComponent({ cart, order, plugin }) {
    // Bundle validation messages
    const bundleLines = cart?.items?.filter((item) => item.bundleParent) || [];
    const bundleOpportunities = cart?.bundleOpportunities || [];
    // Check if there are any stock issues with bundles
    const bundleStockIssues = [];
    bundleLines.forEach((bundleLine) => {
        if (bundleLine.bundleId) {
            const validation = index_1.bundleManager.validateBundleStock(bundleLine.bundleId, bundleLine.quantity);
            if (!validation.isAvailable) {
                bundleStockIssues.push({
                    bundleLine,
                    validation
                });
            }
        }
    });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-checkout-extras", children: [bundleStockIssues.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-stock-warning bg-red-50 border border-red-200 rounded-lg p-4 mb-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center mb-2", children: (0, jsx_runtime_1.jsx)("span", { className: "text-red-600 font-medium", children: "\u26A0\uFE0F Bundle Stock Issues" }) }), bundleStockIssues.map(({ bundleLine, validation }) => ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3 last:mb-0", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm font-medium text-red-800", children: bundleLine.productName }), validation.insufficientItems.map((item) => ((0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-red-700 ml-2", children: ["\u2022 ", item.productName, ": Need ", item.required, ", only ", item.available, " available"] }, item.variantId))), (0, jsx_runtime_1.jsxs)("div", { className: "text-xs text-red-600 mt-1", children: ["Maximum available quantity: ", validation.maxAvailableQuantity] })] }, bundleLine.id)))] })), bundleOpportunities.length > 0 && bundleStockIssues.length === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-last-chance bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center mb-2", children: (0, jsx_runtime_1.jsx)("span", { className: "text-yellow-700 font-medium", children: "\uD83D\uDCA1 Last Chance to Save" }) }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-700 mb-3", children: "Complete a bundle before checkout to maximize your savings!" }), bundleOpportunities.slice(0, 1).map((opportunity) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded border border-yellow-100 p-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-medium text-gray-900", children: opportunity.bundle.name }), (0, jsx_runtime_1.jsxs)("div", { className: "text-green-600 font-bold", children: ["Save $", opportunity.potentialSavings.toFixed(2)] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-gray-600 mb-2", children: ["You have ", opportunity.matches.length, " of ", opportunity.bundle.items.length, " items needed"] }), opportunity.canComplete ? ((0, jsx_runtime_1.jsx)("button", { className: "w-full bg-green-600 text-white py-1.5 px-4 rounded text-sm font-medium hover:bg-green-700", children: "Create Bundle Now" })) : ((0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-orange-600", children: ["Add ", opportunity.missing.length, " more items to complete bundle"] }))] }, opportunity.bundle.id)))] })), bundleLines.length > 0 && bundleStockIssues.length === 0 && ((0, jsx_runtime_1.jsx)("div", { className: "bundle-checkout-success bg-green-50 border border-green-200 rounded-lg p-3", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center text-green-700", children: [(0, jsx_runtime_1.jsx)("span", { className: "mr-2", children: "\u2705" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-sm font-medium", children: ["Bundle", bundleLines.length > 1 ? 's' : '', " ready for checkout"] })] }) }))] }));
}
/**
 * Bundle User Profile Component
 *
 * Displays in user profile/account - bundle purchase history and recommendations
 */
function BundleUserProfileComponent({ user, plugin }) {
    const availableBundles = index_1.bundleManager.getEnabledBundles();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "bundle-user-profile", children: [(0, jsx_runtime_1.jsxs)("h3", { className: "text-lg font-semibold text-gray-900 mb-4 flex items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xl mr-2", children: "\uD83D\uDCE6" }), "Your Bundle Opportunities"] }), (0, jsx_runtime_1.jsx)("div", { className: "space-y-4", children: availableBundles.slice(0, 3).map((bundle) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-start mb-2", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-medium text-gray-900", children: bundle.name }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: bundle.description })] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-right", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-lg font-bold text-blue-600", children: ["$", bundle.price] }), (0, jsx_runtime_1.jsxs)("div", { className: "text-sm text-green-600", children: ["Save $", (bundle.items.reduce((sum, item) => sum + item.unitPrice, 0) - bundle.price).toFixed(2)] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "text-sm text-gray-700 mb-1", children: "Perfect for your goals:" }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-1", children: bundle.tags?.map((tag) => ((0, jsx_runtime_1.jsx)("span", { className: "px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded", children: tag }, tag))) })] }), (0, jsx_runtime_1.jsx)("button", { className: "w-full bg-white border border-blue-300 text-blue-700 py-2 px-4 rounded font-medium hover:bg-blue-50 transition-colors text-sm", children: "View Bundle Details" })] }, bundle.id))) }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-6 pt-6 border-t border-gray-200", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-medium text-gray-900 mb-3", children: "Bundle Purchase History" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600", children: "Your bundle purchases will appear here to help us recommend better combinations for you." })] })] }));
}
