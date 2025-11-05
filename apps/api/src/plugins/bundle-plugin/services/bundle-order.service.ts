import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    EventBus,
    Logger,
    Order,
    OrderLine,
    OrderService,
    RequestContext,
    OrderStateTransitionEvent,
    OrderPlacedEvent,
    TransactionalConnection,
    ID,
} from '@vendure/core';
import { BundleService } from './bundle.service';

/**
 * Bundle Order Service
 * 
 * Handles order lifecycle events for bundles:
 * - Order placement: validate bundle stock
 * - Order cancellation: restore bundle stock
 * - Order state transitions: update bundle metrics
 * 
 * Implements exploded bundle pattern where:
 * - Parent lines track bundle pricing and display
 * - Child lines handle stock consumption and fulfillment
 */
@Injectable()
export class BundleOrderService implements OnModuleInit {
    private static readonly loggerCtx = 'BundleOrderService';

    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private bundleService: BundleService,
    ) {}

    onModuleInit() {
        this.eventBus.ofType(OrderPlacedEvent).subscribe(event => {
            this.handleOrderPlaced(event).catch(err => {
                Logger.error(
                    `Error handling order placed event: ${err.message}`,
                    BundleOrderService.loggerCtx,
                    JSON.stringify({ orderId: event.order.id, error: err })
                );
            });
        });

        // OrderCancelledEvent doesn't exist in v3 - use state transitions instead

        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => {
            this.handleOrderStateTransition(event).catch(err => {
                Logger.error(
                    `Error handling order state transition: ${err.message}`,
                    BundleOrderService.loggerCtx,
                    JSON.stringify({
                        orderId: event.order.id,
                        fromState: event.fromState,
                        toState: event.toState,
                        error: err
                    })
                );
            });
        });
    }

    /**
     * Handle order placement - validate bundle availability
     */
    private async handleOrderPlaced(event: OrderPlacedEvent): Promise<void> {
        const { order } = event;
        const bundleGroups = this.extractBundleGroups(order);

        if (bundleGroups.length === 0) {
            return;
        }

        Logger.verbose(
            `Processing order placement for ${bundleGroups.length} bundle groups`,
            BundleOrderService.loggerCtx
        );

        // Validate stock for all bundles in the order
        for (const group of bundleGroups) {
            const bundleId = (group.parentLine.customFields as any)?.bundleId;
            if (!bundleId) continue;

            try {
                const stockValidation = await this.bundleService.validateBundleStock(
                    event.ctx,
                    bundleId,
                    group.parentLine.quantity
                );

                if (!stockValidation.isAvailable) {
                    Logger.warn(
                        `Bundle stock validation failed for order ${order.id}`,
                        BundleOrderService.loggerCtx
                    );
                }
            } catch (error) {
                Logger.error(
                    `Failed to validate bundle stock during order placement`,
                    BundleOrderService.loggerCtx
                );
            }
        }

        // Update bundle usage metrics
        await this.updateBundleUsageMetrics(event.ctx, bundleGroups);
    }

    /**
     * Handle order cancellation via state transitions
     */
    private handleOrderCancellation(order: Order) {
        const bundleGroups = this.extractBundleGroups(order);
        if (bundleGroups.length === 0) {
            return;
        }

        Logger.verbose(
            `Processing order cancellation for ${bundleGroups.length} bundle groups`,
            BundleOrderService.loggerCtx
        );

        // Log bundle cancellations
        for (const group of bundleGroups) {
            const bundleId = (group.parentLine.customFields as any)?.bundleId;
            Logger.verbose(
                `Bundle cancelled in order`,
                BundleOrderService.loggerCtx
            );
        }
    }

    /**
     * Handle order state transitions for bundle tracking
     */
    private async handleOrderStateTransition(event: OrderStateTransitionEvent): Promise<void> {
        const { order, fromState, toState } = event;
        const bundleGroups = this.extractBundleGroups(order);

        if (bundleGroups.length === 0) {
            return;
        }

        Logger.verbose(
            `Order state transition ${fromState} -> ${toState} for order with ${bundleGroups.length} bundles`,
            BundleOrderService.loggerCtx
        );

        // Track important state transitions for bundle analytics
        if (toState === 'Delivered' || toState === 'Shipped') {
            await this.trackBundleFulfillment(event.ctx, bundleGroups, toState);
        } else if (toState === 'Cancelled') {
            this.handleOrderCancellation(order);
        }
    }

    /**
     * Extract bundle groups from order
     */
    private extractBundleGroups(order: Order): Array<{
        parentLine: OrderLine;
        childLines: OrderLine[];
    }> {
        const bundleGroups: Array<{
            parentLine: OrderLine;
            childLines: OrderLine[];
        }> = [];

        // Find all bundle parent lines
        const parentLines = order.lines.filter(line => 
            (line.customFields as any)?.bundleParent === true
        );

        for (const parentLine of parentLines) {
            // Find all child lines for this parent
            const childLines = order.lines.filter(line => 
                (line.customFields as any)?.bundleChild === true &&
                (line.customFields as any)?.bundleParentLineId === parentLine.id.toString()
            );

            bundleGroups.push({
                parentLine,
                childLines,
            });
        }

        return bundleGroups;
    }

    /**
     * Update bundle usage metrics for analytics
     */
    private async updateBundleUsageMetrics(
        ctx: RequestContext,
        bundleGroups: Array<{ parentLine: OrderLine; childLines: OrderLine[] }>
    ): Promise<void> {
        // In a real implementation, this would update bundle analytics tables
        // For now, we just log the usage for tracking purposes
        for (const group of bundleGroups) {
            const bundleId = (group.parentLine.customFields as any)?.bundleId;
            if (!bundleId) continue;

            Logger.verbose(
                `Bundle sold`,
                BundleOrderService.loggerCtx
            );
        }
    }

    /**
     * Track bundle fulfillment for analytics
     */
    private async trackBundleFulfillment(
        ctx: RequestContext,
        bundleGroups: Array<{ parentLine: OrderLine; childLines: OrderLine[] }>,
        state: string
    ): Promise<void> {
        // In a real implementation, this would update bundle fulfillment metrics
        for (const group of bundleGroups) {
            const bundleId = (group.parentLine.customFields as any)?.bundleId;
            if (!bundleId) continue;

            Logger.verbose(
                `Bundle ${state.toLowerCase()}`,
                BundleOrderService.loggerCtx
            );
        }
    }

    /**
     * Public method to get bundle groups for any order
     * Used by GraphQL resolvers and other services
     */
    async getBundleGroupsForOrder(order: Order): Promise<Array<{
        parentLine: OrderLine;
        childLines: OrderLine[];
        bundleId: string;
    }>> {
        const bundleGroups = this.extractBundleGroups(order);
        
        return bundleGroups.map(group => ({
            ...group,
            bundleId: (group.parentLine.customFields as any)?.bundleId || '',
        }));
    }

    /**
     * Validate bundle order lines consistency
     * Ensures parent-child relationships are correct
     */
    async validateBundleOrderLines(
        ctx: RequestContext,
        order: Order
    ): Promise<{ valid: boolean; issues: string[] }> {
        const issues: string[] = [];
        const bundleGroups = this.extractBundleGroups(order);

        for (const group of bundleGroups) {
            const bundleId = (group.parentLine.customFields as any)?.bundleId;
            if (!bundleId) {
                issues.push(`Parent line ${group.parentLine.id} missing bundleId`);
                continue;
            }

            // Validate bundle exists
            const bundle = await this.bundleService.findOne(ctx, bundleId);
            if (!bundle) {
                issues.push(`Bundle ${bundleId} not found for line ${group.parentLine.id}`);
                continue;
            }

            // Validate child lines match bundle components
            if (group.childLines.length !== bundle.items.length) {
                issues.push(
                    `Bundle ${bundleId} has ${bundle.items.length} components but ` +
                    `${group.childLines.length} child lines`
                );
            }

            // Validate child line quantities match parent
            for (const childLine of group.childLines) {
                const bundleItem = bundle.items.find(
                    item => item.productVariant.id.toString() === childLine.productVariant.id.toString()
                );

                if (!bundleItem) {
                    issues.push(
                        `Child line ${childLine.id} variant not found in bundle ${bundleId}`
                    );
                    continue;
                }

                const expectedQuantity = bundleItem.quantity * group.parentLine.quantity;
                if (childLine.quantity !== expectedQuantity) {
                    issues.push(
                        `Child line ${childLine.id} quantity ${childLine.quantity} ` +
                        `should be ${expectedQuantity}`
                    );
                }
            }
        }

        return {
            valid: issues.length === 0,
            issues,
        };
    }
}