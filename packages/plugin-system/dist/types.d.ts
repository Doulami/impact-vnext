/**
 * Plugin System Type Definitions
 *
 * Core types for the Impact Nutrition plugin architecture
 */
import React from 'react';
export interface User {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    loyaltyPoints?: number;
    isAuthenticated: boolean;
}
export interface Product {
    id: string;
    name: string;
    slug: string;
    price: number;
    description?: string;
    images: string[];
    variants?: ProductVariant[];
    categories: string[];
}
export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    sku: string;
    stock: number;
}
export interface LineItem {
    id: string;
    productId: string;
    productName: string;
    variantId?: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    discountAmount?: number;
}
export interface Discount {
    id: string;
    name: string;
    type: 'percentage' | 'fixed' | 'bundle';
    amount: number;
    applicableItems: string[];
    code?: string;
    description?: string;
}
export interface Bundle {
    id: string;
    name: string;
    productIds: string[];
    discountType: 'percentage' | 'fixed';
    discountAmount: number;
    minQuantity?: number;
}
export interface Cart {
    id: string;
    items: LineItem[];
    discounts: Discount[];
    subtotal: number;
    discountTotal: number;
    total: number;
    pointsToEarn?: number;
    availableDiscounts?: Discount[];
    couponCode?: string;
    userId?: string;
}
export interface Order {
    id: string;
    userId: string;
    items: LineItem[];
    discounts: Discount[];
    subtotal: number;
    discountTotal: number;
    total: number;
    pointsToEarn?: number;
    status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
    createdAt: Date;
    updatedAt: Date;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings?: string[];
}
export interface Plugin {
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    hooks: PluginHooks;
    ui?: PluginUIComponents;
    dependencies?: string[];
}
export interface PluginHooks {
    beforeCartCalculation?: (cart: Cart) => Promise<Cart> | Cart;
    afterCartCalculation?: (cart: Cart) => Promise<Cart> | Cart;
    modifyLineItems?: (items: LineItem[]) => Promise<LineItem[]> | LineItem[];
    calculateDiscounts?: (items: LineItem[], cart: Cart) => Promise<Discount[]> | Discount[];
    beforeCheckout?: (cart: Cart) => Promise<ValidationResult> | ValidationResult;
    afterCheckout?: (order: Order) => Promise<void> | void;
    onUserLogin?: (user: User) => Promise<void> | void;
    onUserRegister?: (user: User) => Promise<void> | void;
    onUserLogout?: (user: User) => Promise<void> | void;
    onOrderCreated?: (order: Order) => Promise<void> | void;
    onOrderPaid?: (order: Order) => Promise<void> | void;
    onOrderShipped?: (order: Order) => Promise<void> | void;
    onOrderCompleted?: (order: Order) => Promise<void> | void;
}
export interface PluginUIComponents {
    cartSummary?: React.ComponentType<any>;
    productDetails?: React.ComponentType<any>;
    checkoutExtras?: React.ComponentType<any>;
    userProfile?: React.ComponentType<any>;
}
export declare enum CartEvents {
    ITEM_ADDED = "cart.item_added",
    ITEM_REMOVED = "cart.item_removed",
    ITEM_UPDATED = "cart.item_updated",
    QUANTITY_CHANGED = "cart.quantity_changed",
    DISCOUNT_APPLIED = "cart.discount_applied",
    DISCOUNT_REMOVED = "cart.discount_removed",
    COUPON_APPLIED = "cart.coupon_applied",
    CHECKOUT_STARTED = "cart.checkout_started",
    CART_CLEARED = "cart.cleared"
}
export declare enum UserEvents {
    LOGIN = "user.login",
    LOGOUT = "user.logout",
    REGISTER = "user.register",
    PROFILE_UPDATED = "user.profile_updated",
    PASSWORD_CHANGED = "user.password_changed"
}
export declare enum OrderEvents {
    CREATED = "order.created",
    UPDATED = "order.updated",
    PAID = "order.paid",
    SHIPPED = "order.shipped",
    DELIVERED = "order.delivered",
    COMPLETED = "order.completed",
    CANCELLED = "order.cancelled",
    REFUNDED = "order.refunded"
}
export type EventName = CartEvents | UserEvents | OrderEvents;
export interface EventPayload {
    eventName: EventName;
    data: any;
    timestamp: Date;
    userId?: string;
}
export interface FeatureFlags {
    plugins: {
        bundles: {
            enabled: boolean;
            maxBundleSize: number;
            discountType: 'percentage' | 'fixed';
            allowCustomBundles: boolean;
        };
        discounts: {
            enabled: boolean;
            sumoEnabled: boolean;
            maxDiscountPercentage: number;
            allowStackableDiscounts: boolean;
            couponCodeEnabled: boolean;
        };
        loyalty: {
            enabled: boolean;
            pointsPerDollar: number;
            redemptionRate: number;
            minRedemptionPoints: number;
            maxRedemptionPercentage: number;
        };
        reviews: {
            enabled: boolean;
            requirePurchase: boolean;
            moderationEnabled: boolean;
        };
        wishlist: {
            enabled: boolean;
            requireAuth: boolean;
            maxItems: number;
        };
    };
    features: {
        search: {
            enabled: boolean;
            instantSearch: boolean;
            filters: string[];
        };
        analytics: {
            enabled: boolean;
            googleAnalytics: boolean;
            facebookPixel: boolean;
        };
        pwa: {
            enabled: boolean;
            offlineMode: boolean;
            pushNotifications: boolean;
        };
    };
}
export interface PluginConfig {
    [key: string]: any;
}
export interface PluginContext {
    featureFlags: FeatureFlags;
    config: PluginConfig;
    user?: User;
    emit: (eventName: EventName, data: any) => void;
}
export interface PluginTestCase {
    name: string;
    description?: string;
    input: {
        cart?: Cart;
        user?: User;
        order?: Order;
        config?: PluginConfig;
    };
    expected: {
        cart?: Partial<Cart>;
        discounts?: Discount[];
        validation?: ValidationResult;
        events?: EventName[];
    };
    plugin: Plugin;
}
export interface TestResult {
    testCase: string;
    passed: boolean;
    error?: string;
    actualResult?: any;
    expectedResult?: any;
    executionTime?: number;
}
//# sourceMappingURL=types.d.ts.map