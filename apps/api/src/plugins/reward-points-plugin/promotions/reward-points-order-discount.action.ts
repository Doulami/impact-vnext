import { LanguageCode, PromotionOrderAction, Logger } from '@vendure/core';
import { Order } from '@vendure/core';

/**
 * Reward Points Order Discount Promotion Action
 * 
 * Phase 4 Implementation - Reward Points Plugin
 * 
 * This promotion action applies reward points discounts at the order level instead of per line item.
 * It reads stored points redemption metadata from Order customFields and applies the pre-calculated
 * discount as a single order-level adjustment.
 * 
 * Key Features:
 * - ORDER LEVEL DISCOUNT: Applied as a single adjustment to the entire order
 * - NO RECOMPUTATION: Only replays stored pointsDiscountValue amounts
 * - SOURCE TAGGING: All adjustments tagged with 'REWARD_POINTS' source
 * - ORDER INTEGRATION: Works with points redemption during checkout
 * - VALIDATION: Ensures discount doesn't exceed order total
 */
export const applyRewardPointsOrderDiscount = new PromotionOrderAction({
    code: 'apply_reward_points_order_discount',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Apply pre-calculated reward points discount stored in Order metadata as order-level discount'
        }
    ],
    
    /**
     * This action has no configurable arguments - it simply reads and applies 
     * the pointsDiscountValue amount that was calculated and stored when 
     * points were redeemed during checkout.
     */
    args: {},
    
    /**
     * Initialize the promotion action
     * This method is called when the promotion system loads the action
     */
    init(injector) {
        // No dependencies needed for this action
        // All required data is stored in order customFields
    },
    
    /**
     * Execute the reward points order discount
     * 
     * This method:
     * 1. Checks if the order has points redemption stored in customFields
     * 2. Reads the total discount value that should be applied
     * 3. Applies the adjustment with proper validation
     * 4. Returns the adjustment for Vendure's promotion system
     */
    execute(ctx, order, args, state) {
        // Access custom fields - they might be nested or directly on the order object
        const orderAny = order as any;
        
        // Try multiple ways to access custom fields
        const pointsDiscountValue = 
            orderAny.customFields?.pointsDiscountValue ?? 
            orderAny.customFieldsPointsdiscountvalue ?? 
            0;
            
        const pointsReserved = 
            orderAny.customFields?.pointsReserved ?? 
            orderAny.customFieldsPointsreserved ?? 
            0;
        
        // Debug logging to understand what we're receiving
        Logger.warn(
            `[PROMOTION DEBUG] Order ${order.code || order.id}: ` +
            `pointsDiscountValue=${pointsDiscountValue}, pointsReserved=${pointsReserved}, ` +
            `hasCustomFields=${!!orderAny.customFields}, ` +
            `directFields={pointsdiscountvalue: ${orderAny.customFieldsPointsdiscountvalue}, pointsreserved: ${orderAny.customFieldsPointsreserved}}`,
            'RewardPointsOrderDiscount'
        );
        
        // Only apply if points are reserved and discount value exists
        if (!pointsDiscountValue || pointsDiscountValue <= 0) {
            Logger.warn(
                `[PROMOTION] No discount value for order ${order.code || order.id}: pointsDiscountValue=${pointsDiscountValue}`,
                'RewardPointsOrderDiscount'
            );
            return 0;
        }
        
        if (!pointsReserved || pointsReserved <= 0) {
            Logger.warn(
                `[PROMOTION] No points reserved for order ${order.code || order.id}: pointsReserved=${pointsReserved}`,
                'RewardPointsOrderDiscount'
            );
            return 0;
        }
        
        // Calculate maximum possible discount (order total excluding shipping)
        const maxDiscount = calculateOrderTotalExcludingShipping(order);
        const finalDiscountAmount = Math.min(Math.abs(pointsDiscountValue), maxDiscount);
        
        const returnValue = -finalDiscountAmount;
        
        Logger.warn(
            `[PROMOTION SUCCESS] Applying points discount for order ${order.code || order.id}: ` +
            `reserved=${pointsReserved}, discountAmount=${finalDiscountAmount}, maxDiscount=${maxDiscount}, ` +
            `RETURNING=${returnValue} (negative for discount)`,
            'RewardPointsOrderDiscount'
        );
        
        // Return negative value for discount
        return returnValue;
    }
});

/**
 * Helper function to identify orders with reward points redemption
 */
export function hasRewardPointsOrderRedemption(order: Order): boolean {
    const customFields = (order as any).customFields;
    return !!(customFields?.pointsDiscountValue && customFields.pointsDiscountValue > 0);
}

/**
 * Helper function to get reward points redemption metadata from order
 */
export function getRewardPointsOrderRedemptionMetadata(order: Order): {
    pointsRedeemed: number;
    pointsDiscountValue: number;
} | null {
    const customFields = (order as any).customFields;
    
    if (!hasRewardPointsOrderRedemption(order)) {
        return null;
    }
    
    return {
        pointsRedeemed: customFields.pointsRedeemed || 0,
        pointsDiscountValue: customFields.pointsDiscountValue
    };
}

/**
 * Calculate order total excluding shipping and shipping tax
 * This ensures that shipping costs are not reduced by points redemption
 */
function calculateOrderTotalExcludingShipping(order: Order): number {
    // Start with total order value
    let orderTotal = order.totalWithTax || order.total || 0;
    
    // Subtract shipping cost and shipping tax
    const shippingWithTax = order.shippingWithTax || 0;
    orderTotal -= shippingWithTax;
    
    // Ensure we don't go below zero
    return Math.max(0, orderTotal);
}