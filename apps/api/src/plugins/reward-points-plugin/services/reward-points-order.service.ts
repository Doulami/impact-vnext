import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    Order,
    OrderLine,
    OrderService,
    Logger,
    ID,
} from '@vendure/core';
import { RewardPointsService } from './reward-points.service';
import { RewardPointsSettingsService } from './reward-points-settings.service';

/**
 * Reward Points Order Service
 * 
 * Handles order integration for reward points:
 * - Validate redeem requests
 * - Store points redemption in order custom fields
 * - Store points redemption value in order line custom fields (for promotion)
 */
@Injectable()
export class RewardPointsOrderService {
    private static readonly loggerCtx = 'RewardPointsOrderService';

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private rewardPointsService: RewardPointsService,
        private settingsService: RewardPointsSettingsService,
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

        // Check customer balance
        const customerPoints = await this.rewardPointsService.getCustomerBalance(ctx, customerId);
        
        if (customerPoints.balance < pointsToRedeem) {
            return {
                valid: false,
                error: `Insufficient points balance. Available: ${customerPoints.balance}, Requested: ${pointsToRedeem}`,
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
     * Stores redemption info in order custom fields and creates order line for promotion
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
        const settings = await this.settingsService.getSettings(ctx);

        // Update order custom fields
        const orderCustomFields = (order.customFields || {}) as any;
        orderCustomFields.pointsRedeemed = pointsToRedeem;
        order.customFields = orderCustomFields;

        // Create a special order line for points redemption discount
        // This line will be used by the promotion action to apply the discount
        // The line itself has zero price, but customFields.pointsRedeemValue stores the discount amount
        const redemptionLine = new OrderLine({
            productVariant: null as any, // No variant for points redemption
            quantity: 1,
            unitPrice: 0, // Zero price line
            unitPriceWithTax: 0,
            linePrice: 0,
            linePriceWithTax: 0,
            customFields: {
                pointsRedeemValue: -redeemValue, // Negative value for discount (in cents)
            } as any,
        });

        // Add line to order (this will be handled by order mutations in Phase 4)
        // For now, we just store the redemption info in order custom fields
        
        // Save order
        const updatedOrder = await this.connection.getRepository(ctx, Order).save(order);

        Logger.info(
            `Applied ${pointsToRedeem} points redemption (${redeemValue} cents discount) to order ${order.id}`,
            RewardPointsOrderService.loggerCtx
        );

        return updatedOrder;
    }

    /**
     * Get points redemption value from order
     */
    getPointsRedemptionFromOrder(order: Order): { points: number; value: number } | null {
        const customFields = (order.customFields || {}) as any;
        const pointsRedeemed = customFields.pointsRedeemed;
        
        if (!pointsRedeemed || pointsRedeemed <= 0) {
            return null;
        }

        // Find redemption value from order lines
        let redeemValue = 0;
        if (order.lines) {
            for (const line of order.lines) {
                const lineCustomFields = (line.customFields || {}) as any;
                if (lineCustomFields.pointsRedeemValue) {
                    redeemValue = Math.abs(lineCustomFields.pointsRedeemValue);
                    break;
                }
            }
        }

        return {
            points: pointsRedeemed,
            value: redeemValue,
        };
    }
}

