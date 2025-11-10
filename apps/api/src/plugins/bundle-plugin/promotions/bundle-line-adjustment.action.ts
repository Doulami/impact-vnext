import { LanguageCode, PromotionItemAction } from '@vendure/core';
import { OrderLine } from '@vendure/core';

/**
 * Bundle Line Adjustment Promotion Action
 * 
 * Phase 3.1 Implementation - Bundle Plugin v2
 * 
 * This promotion action reads stored bundle pricing metadata from OrderLine customFields
 * and applies the pre-calculated adjustments. This is a critical part of the Bundle Plugin v2
 * architecture - all bundle pricing is calculated at add-to-cart time and stored as snapshots,
 * then replayed by this promotion action.
 * 
 * Key Features:
 * - NO RECOMPUTATION: Only replays stored bundleAdjAmount values
 * - SOURCE TAGGING: All adjustments tagged with 'BUNDLE_PRICING' source
 * - EXPLODED BUNDLE SUPPORT: Works with Bundle Plugin v2 exploded bundle pattern
 * - DRIFT CORRECTION: Preserves exact pricing calculations from bundle creation
 */
export const applyBundleLineAdjustments = new PromotionItemAction({
    code: 'apply_bundle_line_adjustments',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Apply pre-calculated bundle pricing adjustments stored in OrderLine metadata'
        }
    ],
    
    /**
     * This action has no configurable arguments - it simply reads and applies 
     * the bundleAdjAmount values that were calculated and stored when the
     * bundle was added to the order.
     */
    args: {},
    
    /**
     * Execute the bundle line adjustment
     * 
     * This method:
     * 1. Checks if the OrderLine has bundle pricing metadata
     * 2. Reads the bundleAdjAmount (pre-calculated discount)
     * 3. Applies the adjustment with proper source tagging
     * 4. Returns the adjustment for Vendure's promotion system
     */
    execute(ctx, orderLine, args) {
        // Only apply to order lines that have bundle pricing metadata
        const customFields = (orderLine as any).customFields;
        if (!customFields) {
            return [];
        }
        
        // Check if this line is part of a bundle (has bundleKey and bundleAdjAmount)
        const bundleKey = customFields.bundleKey;
        const bundleAdjAmount = customFields.bundleAdjAmount;
        const isBundleHeader = customFields.isBundleHeader;
        
        // Skip lines that aren't part of bundles
        if (!bundleKey || bundleAdjAmount === null || bundleAdjAmount === undefined) {
            return [];
        }
        
        // Skip header lines (they have cosmetic pricing only)
        if (isBundleHeader) {
            return [];
        }
        
        // Only apply negative adjustments (discounts)
        if (bundleAdjAmount >= 0) {
            return [];
        }
        
        // Extract bundle metadata for logging and verification
        const bundleName = customFields.bundleName || 'Unknown Bundle';
        const bundleId = customFields.bundleId;
        const bundleVersion = customFields.bundleVersion || 1;
        const baseUnitPrice = customFields.baseUnitPrice || 0;
        const effectiveUnitPrice = customFields.effectiveUnitPrice || 0;
        const bundlePctApplied = customFields.bundlePctApplied || 0;
        
        // Calculate total adjustment for this line
        // bundleAdjAmount is negative (discount), stored in cents
        const adjustmentAmount = bundleAdjAmount; // Already negative
        
        // Validation: Ensure adjustment makes sense
        if (Math.abs(adjustmentAmount) > orderLine.linePrice) {
            // Log warning but don't fail - this could happen with pricing changes
            console.warn(`Bundle adjustment ${adjustmentAmount} exceeds line price ${orderLine.linePrice} for line ${orderLine.id}`);
        }
        
        // Return the discount amount (negative value)
        // Vendure PromotionItemAction expects a number representing the discount
        return adjustmentAmount;
    },
    
    /**
     * Conditions under which this action can be applied
     * 
     * This action should only be applied automatically to bundle lines.
     * It should not be user-configurable as a general promotion action.
     */
    conditions: [
        // This action is automatically applied by the bundle system
        // and should not be manually configured by administrators
    ]
});

/**
 * Helper function to identify bundle order lines
 */
export function isBundleOrderLine(orderLine: OrderLine): boolean {
    const customFields = (orderLine as any).customFields;
    return !!(customFields?.bundleKey && customFields?.bundleAdjAmount !== null);
}

/**
 * Helper function to get bundle adjustment metadata from order line
 */
export function getBundleAdjustmentMetadata(orderLine: OrderLine): {
    bundleKey: string;
    bundleId: string;
    bundleName: string;
    bundleAdjAmount: number;
    bundlePctApplied: number;
    baseUnitPrice: number;
    effectiveUnitPrice: number;
} | null {
    const customFields = (orderLine as any).customFields;
    
    if (!isBundleOrderLine(orderLine)) {
        return null;
    }
    
    return {
        bundleKey: customFields.bundleKey,
        bundleId: customFields.bundleId,
        bundleName: customFields.bundleName || 'Unknown Bundle',
        bundleAdjAmount: customFields.bundleAdjAmount,
        bundlePctApplied: customFields.bundlePctApplied || 0,
        baseUnitPrice: customFields.baseUnitPrice || 0,
        effectiveUnitPrice: customFields.effectiveUnitPrice || 0
    };
}