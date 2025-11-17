import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    Order,
    OrderLine,
    OrderService,
    Logger,
    ID,
    EntityHydrator,
} from '@vendure/core';
import { RewardPointsService } from './reward-points.service';
import { RewardPointsSettingsService } from './reward-points-settings.service';

/**
 * Reward Points Order Service
 * 
 * Handles order integration for reward points:
 * - Validate redeem requests
 * - Store points redemption in order custom fields
 * - Store points redemption value at order level (for PromotionOrderAction)
 */
@Injectable()
export class RewardPointsOrderService {
    private static readonly loggerCtx = 'RewardPointsOrderService';

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private rewardPointsService: RewardPointsService,
        private settingsService: RewardPointsSettingsService,
        private entityHydrator: EntityHydrator,
    ) {}

    /**
     * Validate redeem request
     * Checks if customer has sufficient balance and settings allow redemption
     */
    async validateRedeemRequest(
        ctx: RequestContext,
        customerId: ID,
        pointsToRedeem: number
    ): Promise<{ valid: boolean; error?: string; redeemValue?: number }> {
        // Check if feature is enabled
        const isEnabled = await this.settingsService.isEnabled(ctx);
        if (!isEnabled) {
            return {
                valid: false,
                error: 'Reward points feature is disabled',
            };
        }

        if (pointsToRedeem <= 0) {
            return {
                valid: false,
                error: 'Points to redeem must be greater than 0',
            };
        }

        // Get settings
        const settings = await this.settingsService.getSettings(ctx);

        // Validate min/max limits
        if (pointsToRedeem < settings.minRedeemAmount) {
            return {
                valid: false,
                error: `Minimum redeem amount is ${settings.minRedeemAmount} points. Requested: ${pointsToRedeem}`,
            };
        }

        if (pointsToRedeem > settings.maxRedeemPerOrder) {
            return {
                valid: false,
                error: `Maximum redeem per order is ${settings.maxRedeemPerOrder} points. Requested: ${pointsToRedeem}`,
            };
        }

        // Check available points (balance minus reserved in other pending orders)
        const availablePoints = await this.rewardPointsService.getAvailablePoints(ctx, customerId);
        
        if (availablePoints < pointsToRedeem) {
            return {
                valid: false,
                error: `Insufficient available points. Available: ${availablePoints}, Requested: ${pointsToRedeem}`,
            };
        }

        // Calculate redeem value
        const redeemValue = this.rewardPointsService.calculateRedeemValue(
            pointsToRedeem,
            settings.redeemRate
        );

        return {
            valid: true,
            redeemValue,
        };
    }

    /**
     * Apply points redemption to order
     * Stores redemption info as order-level discount data for PromotionOrderAction
     */
    async applyPointsRedemptionToOrder(
        ctx: RequestContext,
        order: Order,
        pointsToRedeem: number
    ): Promise<Order> {
        // Validate request
        const validation = await this.validateRedeemRequest(
            ctx,
            order.customerId!,
            pointsToRedeem
        );

        if (!validation.valid) {
            throw new Error(validation.error || 'Invalid redeem request');
        }

        const redeemValue = validation.redeemValue!;

        // Hydrate the order with necessary relations for tax calculations
        const hydratedOrder = await this.entityHydrator.hydrate(ctx, order, {
            relations: ['surcharges', 'shippingLines']
        });

        // Calculate the maximum discount based on order total excluding shipping
        const maxDiscountableAmount = this.calculateOrderTotalExcludingShipping(hydratedOrder);
        const actualDiscountValue = Math.min(redeemValue, maxDiscountableAmount);

        // Store redemption info in order custom fields (order-level data)
        const orderCustomFields = (hydratedOrder.customFields || {}) as any;
        orderCustomFields.pointsReserved = pointsToRedeem; // Reserve points, don't redeem yet
        orderCustomFields.pointsDiscountValue = actualDiscountValue; // Store order-level discount value
        orderCustomFields.pointsRedeemed = 0; // No points actually redeemed until payment confirmed
        
        // Preserve existing earned points
        const orderEarned = orderCustomFields.pointsEarned || 0;
        orderCustomFields.pointsEarned = orderEarned;
        
        hydratedOrder.customFields = orderCustomFields;

        // Clear any existing line-level points redemption data to avoid conflicts
        if (hydratedOrder.lines && hydratedOrder.lines.length > 0) {
            for (const line of hydratedOrder.lines) {
                const lineCustomFields = (line.customFields || {}) as any;
                // Remove old line-level discount data if it exists
                if (lineCustomFields.pointsRedeemValue) {
                    delete lineCustomFields.pointsRedeemValue;
                    line.customFields = lineCustomFields;
                }
            }
            
            // Save all lines with cleared custom fields
            await this.connection.getRepository(ctx, OrderLine).save(hydratedOrder.lines);
        }

        // Save the order with updated custom fields
        const updatedOrder = await this.connection.getRepository(ctx, Order).save(hydratedOrder);

        Logger.info(
            `Reserved ${pointsToRedeem} points (${actualDiscountValue} cents order-level discount) for order ${hydratedOrder.id}. ` +
            `Triggering order recalculation to apply promotion discount...`,
            RewardPointsOrderService.loggerCtx
        );

        // CRITICAL: Trigger order recalculation to apply the promotion discount
        // This recalculates all promotions now that custom fields are set
        await this.orderService.applyPriceAdjustments(ctx, updatedOrder);
        
        Logger.info(
            `Order ${updatedOrder.code || updatedOrder.id} recalculated. Promotion should now apply ${actualDiscountValue} cent discount.`,
            RewardPointsOrderService.loggerCtx
        );

        return updatedOrder;
    }

    /**
     * Get points redemption value from order (updated for order-level discount)
     */
    getPointsRedemptionFromOrder(order: Order): { points: number; value: number } | null {
        const customFields = (order.customFields || {}) as any;
        const pointsRedeemed = customFields.pointsRedeemed;
        
        if (!pointsRedeemed || pointsRedeemed <= 0) {
            return null;
        }

        // Get redemption value from order custom fields (order-level discount)
        const redeemValue = customFields.pointsDiscountValue || 0;

        return {
            points: pointsRedeemed,
            value: redeemValue,
        };
    }

    /**
     * Calculate order total excluding shipping and shipping tax
     * This ensures that shipping costs are not reduced by points redemption
     */
    private calculateOrderTotalExcludingShipping(order: Order): number {
        // Start with total order value
        let orderTotal = order.totalWithTax || order.total || 0;
        
        // Subtract shipping cost and shipping tax
        const shippingWithTax = order.shippingWithTax || 0;
        orderTotal -= shippingWithTax;
        
        // Ensure we don't go below zero
        return Math.max(0, orderTotal);
    }
}

