import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, Logger, OrderStateTransitionEvent, RequestContext, EntityHydrator } from '@vendure/core';
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
        private translationService: RewardPointsTranslationService,
        private entityHydrator: EntityHydrator
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

            // Hydrate the order with necessary relations for tax calculations
            const hydratedOrder = await this.entityHydrator.hydrate(event.ctx, event.order, {
                relations: ['surcharges', 'shippingLines', 'lines']
            });

            // Check if reward points plugin is enabled
            const settings = await this.rewardPointsSettingsService.getSettings(event.ctx);
            if (!settings.enabled) {
                Logger.debug(
                    `Reward points disabled, skipping point award for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Check if customer exists
            const customerId = hydratedOrder.customer?.id;
            if (!customerId) {
                Logger.warn(
                    `No customer found for order ${hydratedOrder.code}, skipping point award`,
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
                t => t.orderId === hydratedOrder.id && t.type === 'EARNED'
            );

            if (existingTransaction) {
                Logger.debug(
                    `Points already awarded for order ${hydratedOrder.code}, skipping`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // STEP 1: Convert reserved points → redeemed points
            const orderCustomFields = (hydratedOrder as any).customFields || {};
            const pointsReserved = orderCustomFields.pointsReserved || 0;
            
            if (pointsReserved > 0) {
                const balanceBefore = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;
                
                Logger.info(
                    `[PAYMENT_SETTLED] Converting reserved points to redeemed for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                
                try {
                    // Actually redeem the reserved points from customer balance
                    await this.rewardPointsService.redeemPoints(
                        event.ctx,
                        customerId,
                        pointsReserved,
                        hydratedOrder.id,
                        `Points redeemed for order ${hydratedOrder.code}`
                    );
                    
                    const balanceAfter = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;
                    
                    // Update order to mark points as redeemed (not just reserved)
                    orderCustomFields.pointsRedeemed = pointsReserved;
                    orderCustomFields.pointsReserved = 0; // Clear reservation
                    
                    Logger.info(
                        `[PAYMENT_SETTLED] Redeemed points for order ${hydratedOrder.code}: ` +
                        `customerId=${customerId}, pointsRedeemed=${pointsReserved}, ` +
                        `balanceBefore=${balanceBefore}, balanceAfter=${balanceAfter}`,
                        RewardPointsEventHandlersService.loggerCtx
                    );
                } catch (error) {
                    Logger.error(
                        `[PAYMENT_SETTLED] Failed to redeem reserved points for order ${hydratedOrder.code}: ${error instanceof Error ? error.message : String(error)}`,
                        RewardPointsEventHandlersService.loggerCtx
                    );
                }
            }

            // STEP 2: Calculate and award earned points
            const orderTotal = this.calculateOrderTotalForPoints(hydratedOrder);
            const pointsToAward = this.rewardPointsService.calculatePointsToEarn(orderTotal, settings.earnRate);

            // Skip if no points to award
            if (pointsToAward <= 0) {
                Logger.debug(
                    `[PAYMENT_SETTLED] No points to award for order ${hydratedOrder.code} (total: ${orderTotal})`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            const balanceBeforeEarning = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

            // Award points to customer
            await this.rewardPointsService.awardPoints(
                event.ctx,
                customerId,
                pointsToAward,
                hydratedOrder.id,
                this.translationService.pointsEarnedFromOrder(event.ctx, hydratedOrder.code),
                orderTotal
            );

            const balanceAfterEarning = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

            // Update order custom fields to track points earned
            orderCustomFields.pointsEarned = pointsToAward;

            Logger.info(
                `[PAYMENT_SETTLED] Earned points for order ${hydratedOrder.code}: ` +
                `customerId=${customerId}, pointsEarned=${pointsToAward}, ` +
                `orderTotal=${orderTotal}, balanceBefore=${balanceBeforeEarning}, balanceAfter=${balanceAfterEarning}`,
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
     * Excludes shipping costs, shipping tax, and any reward points redemption discounts
     */
    private calculateOrderTotalForPoints(order: any): number {
        // Start with the base order total
        let orderTotal = order.totalWithTax || order.total || 0;

        // Subtract shipping cost and shipping tax (points should not be earned/redeemed on shipping)
        const shippingWithTax = order.shippingWithTax || 0;
        orderTotal -= shippingWithTax;

        // Subtract any points redemption discount that was already applied
        const pointsDiscountValue = order.customFields?.pointsDiscountValue || 0;
        if (pointsDiscountValue > 0) {
            // Remove the points discount from the calculation to avoid circular point earning
            orderTotal += pointsDiscountValue; // Add back the discount since we want to calculate points on the pre-discount amount
            Logger.debug(
                `Order ${order.code} had ${pointsDiscountValue} cents points discount, calculating points on pre-discount amount`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }

        // Ensure we don't have negative totals
        orderTotal = Math.max(0, orderTotal);

        Logger.debug(
            `Calculated order total for points: ${orderTotal} (original: ${order.totalWithTax || order.total}, shipping: ${shippingWithTax}, points discount: ${pointsDiscountValue})`,
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