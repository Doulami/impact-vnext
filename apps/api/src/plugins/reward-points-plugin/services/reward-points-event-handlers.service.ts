import { Injectable, OnModuleInit } from '@nestjs/common';
import { 
    EventBus, 
    Logger, 
    OrderStateTransitionEvent, 
    PaymentStateTransitionEvent,
    RefundStateTransitionEvent,
    RequestContext, 
    EntityHydrator 
} from '@vendure/core';
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

        // Listen to payment state transitions to release reserved points on decline
        this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async (event) => {
            await this.handlePaymentStateTransition(event);
        });

        // Listen to refund state transitions to handle partial refunds
        this.eventBus.ofType(RefundStateTransitionEvent).subscribe(async (event) => {
            await this.handleRefundStateTransition(event);
        });
    }

    /**
     * Handle order state transition events
     * Awards points when order transitions to "PaymentSettled"
     * Releases/refunds/removes points on cancellation
     */
    private async handleOrderStateTransition(event: OrderStateTransitionEvent): Promise<void> {
        try {
            // Handle PaymentSettled: redeem reserved + award earned
            if (event.toState === 'PaymentSettled') {
                await this.handlePaymentSettled(event);
                return;
            }
            
            // Handle Cancelled: release/refund/remove points
            if (event.toState === 'Cancelled') {
                await this.handleCancellation(event);
                return;
            }
        } catch (error) {
            Logger.error(
                `Failed to process order state transition for order ${event.order.code}: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }
    }

    /**
     * Handle PaymentSettled state: redeem reserved points and award earned points
     */
    private async handlePaymentSettled(event: OrderStateTransitionEvent): Promise<void> {
        try {

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

        // NOTE: We do NOT subtract pointsDiscountValue here because order.totalWithTax 
        // already has the points discount applied by Vendure's promotion system.
        // The promotion action returns a negative adjustment which Vendure automatically 
        // subtracts from the order total. Subtracting it again would be double-counting.

        // Ensure we don't have negative totals
        orderTotal = Math.max(0, orderTotal);

        Logger.debug(
            `Calculated order total for points: ${orderTotal} (original: ${order.totalWithTax || order.total}, shipping: ${shippingWithTax})`,
            RewardPointsEventHandlersService.loggerCtx
        );

        return orderTotal;
    }

    /**
     * Handle payment state transitions
     * Release reserved points on payment decline/error/cancelled
     */
    private async handlePaymentStateTransition(event: PaymentStateTransitionEvent): Promise<void> {
        try {
            // Only handle declined/error/cancelled payment states
            const failureStates = ['Declined', 'Error', 'Cancelled'];
            if (!failureStates.includes(event.toState)) {
                return;
            }

            Logger.debug(
                `Processing payment state transition: ${event.toState} for order ${event.payment.order?.code}`,
                RewardPointsEventHandlersService.loggerCtx
            );

            const order = event.payment.order;
            if (!order) {
                Logger.warn(
                    `No order found for payment ${event.payment.id}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Hydrate order with customer
            const hydratedOrder = await this.entityHydrator.hydrate(event.ctx, order, {
                relations: ['customer']
            });

            const customerId = hydratedOrder.customer?.id;
            if (!customerId) {
                Logger.warn(
                    `No customer found for order ${hydratedOrder.code} with failed payment`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            const orderCustomFields = (hydratedOrder as any).customFields || {};
            const pointsReserved = orderCustomFields.pointsReserved || 0;
            const pointsRedeemed = orderCustomFields.pointsRedeemed || 0;

            // Only release if points are still reserved (not yet redeemed)
            if (pointsReserved > 0 && pointsRedeemed === 0) {
                Logger.info(
                    `[PAYMENT_${event.toState.toUpperCase()}] Releasing ${pointsReserved} reserved points for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );

                // Clear reservation
                orderCustomFields.pointsReserved = 0;
                orderCustomFields.pointsReleased = pointsReserved;

                // Create RELEASED transaction
                await this.rewardPointsService.createTransaction(
                    event.ctx,
                    customerId,
                    'RELEASED' as any,
                    pointsReserved,
                    `Reserved points released due to payment ${event.toState.toLowerCase()}`,
                    hydratedOrder.id
                );

                Logger.info(
                    `[PAYMENT_${event.toState.toUpperCase()}] Released ${pointsReserved} points for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
            } else if (pointsReserved === 0 && pointsRedeemed === 0) {
                Logger.debug(
                    `No points to release for order ${hydratedOrder.code} - no points were reserved`,
                    RewardPointsEventHandlersService.loggerCtx
                );
            } else if (pointsRedeemed > 0) {
                Logger.debug(
                    `Points already redeemed for order ${hydratedOrder.code} - will handle via order cancellation if needed`,
                    RewardPointsEventHandlersService.loggerCtx
                );
            }

        } catch (error) {
            Logger.error(
                `Failed to process payment state transition: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }
    }

    /**
     * Handle refund state transitions
     * Proportionally remove earned points on partial refunds
     */
    private async handleRefundStateTransition(event: RefundStateTransitionEvent): Promise<void> {
        try {
            // Only process when refund is settled (successful)
            if (event.toState !== 'Settled') {
                return;
            }

            Logger.debug(
                `Processing refund state transition: ${event.fromState} → ${event.toState} for order ${event.order.code}`,
                RewardPointsEventHandlersService.loggerCtx
            );

            const order = event.order;
            const refund = event.refund;

            // Hydrate order with customer
            const hydratedOrder = await this.entityHydrator.hydrate(event.ctx, order, {
                relations: ['customer']
            });

            const customerId = hydratedOrder.customer?.id;
            if (!customerId) {
                Logger.warn(
                    `No customer found for order ${hydratedOrder.code} with refund`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            const orderCustomFields = (hydratedOrder as any).customFields || {};
            const pointsEarned = orderCustomFields.pointsEarned || 0;

            // Skip if no points were earned on this order
            if (pointsEarned <= 0) {
                Logger.debug(
                    `No points earned on order ${hydratedOrder.code}, skipping partial refund adjustment`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            // Calculate refund percentage
            const orderTotal = hydratedOrder.totalWithTax || hydratedOrder.total || 0;
            const refundAmount = refund.total || 0;

            if (orderTotal <= 0) {
                Logger.warn(
                    `Order ${hydratedOrder.code} has zero or negative total, cannot calculate refund percentage`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            const refundPercentage = refundAmount / orderTotal;
            const earnedPointsToRemove = Math.floor(pointsEarned * refundPercentage);

            // Skip if no points to remove (refund too small)
            if (earnedPointsToRemove <= 0) {
                Logger.debug(
                    `Refund percentage too small (${(refundPercentage * 100).toFixed(2)}%) to remove any points from order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            Logger.info(
                `[REFUND_SETTLED] Partial refund for order ${hydratedOrder.code}: ` +
                `refundAmount=${refundAmount}, orderTotal=${orderTotal}, ` +
                `percentage=${(refundPercentage * 100).toFixed(2)}%, ` +
                `pointsEarned=${pointsEarned}, pointsToRemove=${earnedPointsToRemove}`,
                RewardPointsEventHandlersService.loggerCtx
            );

            // Check available points (respect reserved points protection)
            const availablePoints = await this.rewardPointsService.getAvailablePoints(event.ctx, customerId);
            const actualPointsToRemove = Math.min(earnedPointsToRemove, availablePoints);

            if (actualPointsToRemove > 0) {
                const balanceBefore = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

                // Remove earned points proportionally
                await this.rewardPointsService.adjustCustomerPoints(
                    event.ctx,
                    customerId,
                    -actualPointsToRemove,
                    `Partial refund adjustment for order ${hydratedOrder.code} (${(refundPercentage * 100).toFixed(0)}% refund)`
                );

                const balanceAfter = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

                // Track removed points (add to existing if multiple partial refunds)
                const previouslyRemoved = orderCustomFields.pointsRemoved || 0;
                orderCustomFields.pointsRemoved = previouslyRemoved + actualPointsToRemove;

                // Create REMOVED transaction
                await this.rewardPointsService.createTransaction(
                    event.ctx,
                    customerId,
                    'REMOVED' as any,
                    -actualPointsToRemove,
                    `Partial refund: ${actualPointsToRemove} points removed (${(refundPercentage * 100).toFixed(0)}% of order) for ${hydratedOrder.code}`,
                    hydratedOrder.id
                );

                if (actualPointsToRemove < earnedPointsToRemove) {
                    Logger.warn(
                        `[REFUND_SETTLED] Could only remove ${actualPointsToRemove} of ${earnedPointsToRemove} earned points ` +
                        `for partial refund on order ${hydratedOrder.code} - customer has already spent some (available=${availablePoints})`,
                        RewardPointsEventHandlersService.loggerCtx
                    );
                } else {
                    Logger.info(
                        `[REFUND_SETTLED] Removed ${actualPointsToRemove} points for partial refund on order ${hydratedOrder.code}: ` +
                        `balanceBefore=${balanceBefore}, balanceAfter=${balanceAfter}`,
                        RewardPointsEventHandlersService.loggerCtx
                    );
                }
            } else {
                Logger.warn(
                    `[REFUND_SETTLED] Cannot remove any earned points for partial refund on order ${hydratedOrder.code} - ` +
                    `need to remove ${earnedPointsToRemove} but only ${availablePoints} available (reserved in other orders)`,
                    RewardPointsEventHandlersService.loggerCtx
                );
            }

        } catch (error) {
            Logger.error(
                `Failed to process refund state transition: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }
    }

    /**
     * Handle order cancellation: release/refund/remove points
     */
    private async handleCancellation(event: OrderStateTransitionEvent): Promise<void> {
        try {
            Logger.debug(
                `Processing cancellation/decline for order: ${event.order.code} (${event.fromState} → ${event.toState})`,
                RewardPointsEventHandlersService.loggerCtx
            );

            // Hydrate order
            const hydratedOrder = await this.entityHydrator.hydrate(event.ctx, event.order, {
                relations: ['customer']
            });

            const customerId = hydratedOrder.customer?.id;
            if (!customerId) {
                Logger.warn(
                    `No customer found for cancelled order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
                return;
            }

            const orderCustomFields = (hydratedOrder as any).customFields || {};

            // PHASE 1: Release reserved points (if payment not yet settled)
            const pointsReserved = orderCustomFields.pointsReserved || 0;
            const pointsRedeemed = orderCustomFields.pointsRedeemed || 0;
            
            if (pointsReserved > 0 && pointsRedeemed === 0) {
                // Points were reserved but never redeemed (cancelled before payment)
                Logger.info(
                    `[${event.toState}] Releasing ${pointsReserved} reserved points for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );

                // Clear reservation (no balance change needed - they were never deducted)
                orderCustomFields.pointsReserved = 0;
                orderCustomFields.pointsReleased = pointsReserved;

                // Create RELEASED transaction for audit
                await this.rewardPointsService.createTransaction(
                    event.ctx,
                    customerId,
                    'RELEASED' as any,
                    pointsReserved,
                    `Reserved points released due to order ${event.toState.toLowerCase()}`,
                    hydratedOrder.id
                );

                Logger.info(
                    `[${event.toState}] Released ${pointsReserved} points for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
            }

            // PHASE 2: Refund redeemed points (if cancelled after payment)
            if (pointsRedeemed > 0) {
                Logger.info(
                    `[${event.toState}] Refunding ${pointsRedeemed} redeemed points for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );

                const balanceBefore = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

                // Add points back to customer balance
                await this.rewardPointsService.adjustCustomerPoints(
                    event.ctx,
                    customerId,
                    pointsRedeemed,
                    `Refund for cancelled order ${hydratedOrder.code}`
                );

                const balanceAfter = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

                // Update order fields
                orderCustomFields.pointsRefunded = pointsRedeemed;
                orderCustomFields.pointsRedeemed = 0;

                // Create REFUNDED transaction
                await this.rewardPointsService.createTransaction(
                    event.ctx,
                    customerId,
                    'REFUNDED' as any,
                    pointsRedeemed,
                    `Points refunded for cancelled order ${hydratedOrder.code}`,
                    hydratedOrder.id
                );

                Logger.info(
                    `[${event.toState}] Refunded ${pointsRedeemed} points for order ${hydratedOrder.code}: ` +
                    `balanceBefore=${balanceBefore}, balanceAfter=${balanceAfter}`,
                    RewardPointsEventHandlersService.loggerCtx
                );
            }

            // PHASE 3: Remove earned points (if cancelled after earning)
            const pointsEarned = orderCustomFields.pointsEarned || 0;
            
            if (pointsEarned > 0) {
                Logger.info(
                    `[${event.toState}] Attempting to remove ${pointsEarned} earned points for order ${hydratedOrder.code}`,
                    RewardPointsEventHandlersService.loggerCtx
                );

                const availablePoints = await this.rewardPointsService.getAvailablePoints(event.ctx, customerId);
                const pointsToRemove = Math.min(pointsEarned, availablePoints);

                if (pointsToRemove > 0) {
                    const balanceBefore = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

                    // Remove earned points (respecting reserved points protection)
                    await this.rewardPointsService.adjustCustomerPoints(
                        event.ctx,
                        customerId,
                        -pointsToRemove,
                        `Removal of earned points for cancelled order ${hydratedOrder.code}`
                    );

                    const balanceAfter = (await this.rewardPointsService.getCustomerBalance(event.ctx, customerId)).balance;

                    orderCustomFields.pointsRemoved = pointsToRemove;

                    // Create REMOVED transaction
                    await this.rewardPointsService.createTransaction(
                        event.ctx,
                        customerId,
                        'REMOVED' as any,
                        -pointsToRemove,
                        `Earned points removed for cancelled order ${hydratedOrder.code}`,
                        hydratedOrder.id
                    );

                    if (pointsToRemove < pointsEarned) {
                        Logger.warn(
                            `[${event.toState}] Could only remove ${pointsToRemove} of ${pointsEarned} earned points ` +
                            `for order ${hydratedOrder.code} - customer has already spent some (available=${availablePoints})`,
                            RewardPointsEventHandlersService.loggerCtx
                        );
                    } else {
                        Logger.info(
                            `[${event.toState}] Removed ${pointsToRemove} earned points for order ${hydratedOrder.code}: ` +
                            `balanceBefore=${balanceBefore}, balanceAfter=${balanceAfter}`,
                            RewardPointsEventHandlersService.loggerCtx
                        );
                    }
                } else {
                    Logger.warn(
                        `[${event.toState}] Cannot remove any earned points for order ${hydratedOrder.code} - ` +
                        `all ${pointsEarned} points are reserved in other orders (available=${availablePoints})`,
                        RewardPointsEventHandlersService.loggerCtx
                    );
                }
            }

        } catch (error) {
            Logger.error(
                `Failed to process cancellation/decline for order ${event.order.code}: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsEventHandlersService.loggerCtx
            );
        }
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
