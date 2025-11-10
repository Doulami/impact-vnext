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
export declare function BundleCartSummaryComponent({ cart, plugin }: {
    cart: any;
    plugin: any;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Bundle Product Details Component
 *
 * Displays on product pages - shows bundles this product is part of
 */
export declare function BundleProductDetailsComponent({ product, plugin }: {
    product: any;
    plugin: any;
}): import("react/jsx-runtime").JSX.Element | null;
/**
 * Bundle Checkout Extras Component
 *
 * Displays during checkout - validation messages and last-chance bundle offers
 */
export declare function BundleCheckoutExtrasComponent({ cart, order, plugin }: {
    cart?: any;
    order?: any;
    plugin: any;
}): import("react/jsx-runtime").JSX.Element;
/**
 * Bundle User Profile Component
 *
 * Displays in user profile/account - bundle purchase history and recommendations
 */
export declare function BundleUserProfileComponent({ user, plugin }: {
    user: any;
    plugin: any;
}): import("react/jsx-runtime").JSX.Element;
