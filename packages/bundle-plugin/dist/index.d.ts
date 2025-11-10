/**
 * Bundle Plugin - Exploded Bundles for Impact Nutrition
 *
 * Implements bundles as single visible lines with hidden component children
 */
import { Plugin, LineItem } from '@impact/plugin-system';
export interface Bundle {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    assets: string[];
    price: number;
    enabled: boolean;
    items: BundleItem[];
    category?: string;
    tags?: string[];
}
export interface BundleItem {
    variantId: string;
    productName: string;
    variantName?: string;
    quantity: number;
    unitPrice: number;
    displayOrder?: number;
}
export interface BundleLineItem extends LineItem {
    bundleParent?: boolean;
    bundleId?: string;
    bundleChild?: boolean;
    bundleParentLineId?: string;
    originalPrice?: number;
}
/**
 * Bundle detection and processing utilities
 */
export declare class BundleManager {
    private bundles;
    constructor();
    /**
     * Get bundle by ID
     */
    getBundle(bundleId: string): Bundle | undefined;
    /**
     * Get all enabled bundles
     */
    getEnabledBundles(): Bundle[];
    /**
     * Detect potential bundles in cart items
     */
    detectBundleOpportunities(items: LineItem[]): Array<{
        bundle: Bundle;
        matches: BundleItem[];
        missing: BundleItem[];
        canComplete: boolean;
        potentialSavings: number;
    }>;
    /**
     * Convert cart items to bundle + components
     */
    createBundleFromItems(bundleId: string, quantity?: number): {
        parentLine: BundleLineItem;
        childLines: BundleLineItem[];
    } | null;
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
    };
}
declare const bundleManager: BundleManager;
/**
 * Bundle Plugin Implementation
 */
export declare const BundlePlugin: Plugin;
export { bundleManager };
export default BundlePlugin;
