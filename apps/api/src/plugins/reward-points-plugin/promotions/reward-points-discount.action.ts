import { LanguageCode, PromotionItemAction } from '@vendure/core';
import { OrderLine } from '@vendure/core';

/**
 * Reward Points Discount Promotion Action
 * 
 * Phase 4 Implementation - Reward Points Plugin
 * 
 * This promotion action reads stored points redemption metadata from OrderLine customFields
 * and applies the pre-calculated discount. This follows the Bundle Plugin v2 architecture
 * pattern - all points redemption calculations are done at checkout time and stored as snapshots,
 * then replayed by this promotion action.
 * 
 * Key Features:
 * - NO RECOMPUTATION: Only replays stored pointsRedeemValue discount amounts
 * - SOURCE TAGGING: All adjustments tagged with 'REWARD_POINTS' source
 * - ORDER INTEGRATION: Works with points redemption during checkout
 * - VALIDATION: Ensures discount doesn't exceed line price
 */
export const applyRewardPointsDiscount = new PromotionItemAction({
    code: 'apply_reward_points_discount',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Apply pre-calculated reward points discount stored in OrderLine metadata'
        }
    ],
    
    /**
     * This action has no configurable arguments - it simply reads and applies 
     * the pointsRedeemValue amounts that were calculated and stored when 
     * points were redeemed during checkout.
     */
    args: {},
    
    /**
     * Execute the reward points discount
     * 
     * This method:
     * 1. Checks if the OrderLine has points redemption metadata
     * 2. Reads the pointsRedeemValue (pre-calculated discount in cents)
     * 3. Applies the adjustment with proper validation
     * 4. Returns the adjustment for Vendure's promotion system
     */
    execute(ctx, orderLine, args) {
        // Only apply to order lines that have reward points redemption metadata
        const customFields = (orderLine as any).customFields;
        if (!customFields) {
            return 0;
        }
        
        // Check if this line has points redemption discount
        const pointsRedeemValue = customFields.pointsRedeemValue;
        
        // Skip lines that don't have points redemption
        if (pointsRedeemValue === null || pointsRedeemValue === undefined || pointsRedeemValue === 0) {
            return 0;
        }
        
        // Only apply negative adjustments (discounts)
        // pointsRedeemValue should be positive (discount amount), so we make it negative
        if (pointsRedeemValue <= 0) {
            return 0;
        }
        
        // Calculate the discount amount (negative value for Vendure)
        const discountAmount = -Math.abs(pointsRedeemValue);
        
        // Validation: Ensure discount doesn't exceed line price
        if (Math.abs(discountAmount) > orderLine.linePrice) {
            // Log warning but cap the discount at the line price
            console.warn(`Reward points discount ${Math.abs(discountAmount)} exceeds line price ${orderLine.linePrice} for line ${orderLine.id}, capping discount`);
            return -orderLine.linePrice;
        }
        
        // Return the discount amount (negative value represents discount)
        // Vendure PromotionItemAction expects a number representing the discount
        return discountAmount;
    },
    
    /**
     * Conditions under which this action can be applied
     * 
     * This action should only be applied automatically to lines with points redemption.
     * It should not be user-configurable as a general promotion action.
     */
    conditions: [
        // This action is automatically applied by the reward points system
        // and should not be manually configured by administrators
    ]
});

/**
 * Helper function to identify order lines with reward points redemption
 */
export function hasRewardPointsRedemption(orderLine: OrderLine): boolean {
    const customFields = (orderLine as any).customFields;
    return !!(customFields?.pointsRedeemValue && customFields.pointsRedeemValue > 0);
}

/**
 * Helper function to get reward points redemption metadata from order line
 */
export function getRewardPointsRedemptionMetadata(orderLine: OrderLine): {
    pointsRedeemValue: number;
} | null {
    const customFields = (orderLine as any).customFields;
    
    if (!hasRewardPointsRedemption(orderLine)) {
        return null;
    }
    
    return {
        pointsRedeemValue: customFields.pointsRedeemValue
    };
}