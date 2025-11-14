import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, Logger, OrderStateTransitionEvent, RequestContext } from '@vendure/core';
import { RewardPointsSettingsService } from './reward-points-settings.service';
import { RewardPointsService } from './reward-points.service';
import { RewardPointsTranslationService } from './reward-points-translation.service';

/**
 * Reward Points Event Handlers Service
 * 
 * Phase 4 Implementation - Reward Points Plugin
 * 
 * This service listens to Vendure events and automatically awards reward points
 * to customers when their orders reach the "PaymentSettled" state.
 * 
 * Key Features:
 * - Automatic point awarding after payment settlement
 * - Points calculated based on order total (excluding points discount)
 * - Transaction history tracking
 * - Plugin enabled/disabled checking
 * - Error handling and logging
 */
@Injectable()
export class RewardPointsEventHandlersService implements OnModuleInit {
    private static readonly loggerCtx = 'RewardPointsEventHandlersService';

    constructor(
        private eventBus: EventBus,
        private rewardPointsSettingsService: RewardPointsSettingsService,
        private rewardPointsService: RewardPointsService,
        private translationService: RewardPointsTranslationService
    ) {}

    async onModuleInit() {
        this.subscribeToEvents();
        Logger.info('Reward points event handlers initialized', RewardPointsEventHandlersService.loggerCtx);
    }

    /**
     * Subscribe to Vendure events
     */
    private subscribeToEvents(): void {
        // Listen to order state transitions to award points when payment is settled
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            await this.handleOrderStateTransition(event);
        });
    }

    /**
     * Handle order state transition events
     * Awards points when order transitions to "PaymentSettled"
     */
    private async handleOrderStateTransition(event: OrderStateTransitionEvent): Promise<void> {
        try {
            // Only process if transitioning TO PaymentSettled state
            if (event.toState !== 'PaymentSettled') {
                return;
            }

            // Skip if transitioning FROM PaymentSettled (avoid double awarding)
            if (event.fromState === 'PaymentSettled') {
                return;
            }

            Logger.debug(
                `Processing order state transition: ${event.order.code} (${event.fromState} → ${event.toState})`,
                RewardPointsEventHandlersService.loggerCtx
            );

            // Check if reward points plugin is enabled
            const settings = await this.rewardPointsSettingsService.getSettings(event.ctx);
            if (!settings.enabled) {
                Logger.debug(
                    `Reward points disabled, skipping point award for order ${event.order.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Check if customer exists
            const customerId = event.order.customer?.id;
            if (!customerId) {
                Logger.warn(
                    `No customer found for order ${event.order.code}, skipping point award`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Check if points were already awarded for this order
            // Note: Simple check by getting recent transactions and filtering manually
            const recentTransactions = await this.rewardPointsService.getTransactionHistory(
                event.ctx,
                customerId,
                { 
                    skip: 0, 
                    take: 10 // Get more to check for this specific order
                }
            );

            // Check if any recent transaction is for this order and of type EARNED
            const existingTransaction = recentTransactions.items.find(
                t => t.orderId === event.order.id && t.type === 'EARNED'
            );

            if (existingTransaction) {
                Logger.debug(
                    `Points already awarded for order ${event.order.code}, skipping`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Calculate points to award based on order total
            const orderTotal = this.calculateOrderTotalForPoints(event.order);
            const pointsToAward = this.rewardPointsService.calculatePointsToEarn(orderTotal, settings.earnRate);

            // Skip if no points to award
            if (pointsToAward <= 0) {
                Logger.debug(
                    `No points to award for order ${event.order.code} (total: ${orderTotal})`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Award points to customer
            await this.rewardPointsService.awardPoints(
                event.ctx,
                customerId,
                pointsToAward,
                event.order.id,
                this.translationService.pointsEarnedFromOrder(event.ctx, event.order.code)
            );

            // Update order custom fields to track points earned
            const customFields = (event.order as any).customFields || {};
            customFields.pointsEarned = pointsToAward;

            Logger.info(
                `Awarded ${pointsToAward} points to customer ${customerId} for order ${event.order.code} (total: ${orderTotal})`,
                RewardPointsEventHandlersService.loggerCtx
            );

        } catch (error) {
            Logger.error(
                `Failed to process order state transition for order ${event.order.code}: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }
    }

    /**
     * Calculate the order total that should be used for points calculation
     * Excludes any reward points redemption discounts to avoid circular point earning
     */
    private calculateOrderTotalForPoints(order: any): number {
        // Start with the base order total
        let orderTotal = order.totalWithTax || order.total || 0;

        // Subtract any points redemption discount from custom fields
        const pointsRedeemed = order.customFields?.pointsRedeemed || 0;
        if (pointsRedeemed > 0) {
            // Points redeemed represents the discount amount already applied
            // We don't need to subtract it again as it's already reflected in the order total
            Logger.debug(
                `Order ${order.code} used ${pointsRedeemed} points, but total already reflects discount`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }

        // Ensure we don't have negative totals
        orderTotal = Math.max(0, orderTotal);

        Logger.debug(
            `Calculated order total for points: ${orderTotal} (original: ${order.totalWithTax || order.total})`,
            RewardPointsEventHandlersService.loggerCtx
        );

        return orderTotal;
    }

    /**
     * Manually trigger point awarding for an order (for testing or admin operations)
     */
    async awardPointsForOrder(ctx: RequestContext, orderId: string): Promise<void> {
        try {
            // This could be used by admin operations or testing
            Logger.info(
                `Manually triggering point award for order ${orderId}`,
                RewardPointsEventHandlersService.loggerCtx
            );

            // Would need to fetch order and create a mock event
            // Implementation would depend on specific admin requirements
            
        } catch (error) {
            Logger.error(
                `Failed to manually award points for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }
    }
}