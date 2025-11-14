import {
    Resolver,
    Query,
    Mutation,
    Args,
    ResolveField,
    Parent,
} from '@nestjs/graphql';
import {
    Ctx,
    RequestContext,
    ID,
    Order,
    Customer,
    Logger,
    Transaction,
    CustomerService,
} from '@vendure/core';
import { RewardPointsService } from '../services/reward-points.service';
import { RewardPointsSettingsService } from '../services/reward-points-settings.service';
import { RewardPointsOrderService } from '../services/reward-points-order.service';
import { CustomerRewardPoints } from '../entities/customer-reward-points.entity';
import { RewardTransaction } from '../entities/reward-transaction.entity';
import { OrderService } from '@vendure/core';
import { ActiveOrderService } from '@vendure/core';

/**
 * Shop API Reward Points Resolver
 * 
 * Handles customer-facing reward points queries and mutations:
 * - Get customer reward points balance
 * - Get transaction history
 * - Redeem points during checkout
 */
@Resolver('CustomerRewardPoints')
export class ShopApiRewardPointsResolver {
    private static readonly loggerCtx = 'ShopApiRewardPointsResolver';

    constructor(
        private rewardPointsService: RewardPointsService,
        private rewardPointsSettingsService: RewardPointsSettingsService,
        private rewardPointsOrderService: RewardPointsOrderService,
        private orderService: OrderService,
        private activeOrderService: ActiveOrderService,
        private customerService: CustomerService,
    ) {}

    /**
     * Get current customer's reward points balance
     */
    @Query()
    async customerRewardPoints(
        @Ctx() ctx: RequestContext
    ): Promise<CustomerRewardPoints | null> {
        if (!ctx.activeUserId) {
            return null;
        }

        try {
            // Get customer from active user ID
            const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
            if (!customer) {
                return null;
            }
            
            // Check if feature is enabled
            const isEnabled = await this.rewardPointsSettingsService.isEnabled(ctx);
            if (!isEnabled) {
                return null; // Return null if feature is disabled
            }

            return await this.rewardPointsService.getCustomerBalance(ctx, customer.id);
        } catch (error) {
            Logger.error(
                `Failed to get customer reward points: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiRewardPointsResolver.loggerCtx
            );
            return null;
        }
    }

    /**
     * Get current customer's transaction history
     */
    @Query()
    async rewardTransactionHistory(
        @Ctx() ctx: RequestContext,
        @Args() args: { skip?: number; take?: number }
    ): Promise<{ items: RewardTransaction[]; totalItems: number }> {
        if (!ctx.activeUserId) {
            return { items: [], totalItems: 0 };
        }

        try {
            // Get customer from active user ID
            const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
            if (!customer) {
                return { items: [], totalItems: 0 };
            }
            
            // Check if feature is enabled
            const isEnabled = await this.rewardPointsSettingsService.isEnabled(ctx);
            if (!isEnabled) {
                return { items: [], totalItems: 0 };
            }

            return await this.rewardPointsService.getTransactionHistory(ctx, customer.id, {
                skip: args.skip || 0,
                take: args.take || 10,
            });
        } catch (error) {
            Logger.error(
                `Failed to get transaction history: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiRewardPointsResolver.loggerCtx
            );
            return { items: [], totalItems: 0 };
        }
    }

    /**
     * Get reward points settings (public info only)
     */
    @Query()
    async rewardPointSettings(
        @Ctx() ctx: RequestContext
    ): Promise<{ enabled: boolean; minRedeemAmount: number; maxRedeemPerOrder: number } | null> {
        try {
            const settings = await this.rewardPointsSettingsService.getSettings(ctx);
            
            // Return only public info (not rates)
            return {
                enabled: settings.enabled,
                minRedeemAmount: settings.minRedeemAmount,
                maxRedeemPerOrder: settings.maxRedeemPerOrder,
            };
        } catch (error) {
            Logger.error(
                `Failed to get reward points settings: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiRewardPointsResolver.loggerCtx
            );
            return null;
        }
    }

    /**
     * Redeem points during checkout
     */
    @Mutation()
    @Transaction()
    async redeemPoints(
        @Ctx() ctx: RequestContext,
        @Args() args: { points: number }
    ): Promise<Order> {
        if (!ctx.activeUserId) {
            throw new Error('User must be logged in to redeem points');
        }

        try {
            // Get customer from active user ID
            const customer = await this.customerService.findOneByUserId(ctx, ctx.activeUserId);
            if (!customer) {
                throw new Error('Customer not found');
            }

            // Get active order
            let activeOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            
            if (!activeOrder) {
                // Create a new order if none exists
                activeOrder = await this.orderService.create(ctx, ctx.activeUserId);
            }

            // Validate redeem request
            const validation = await this.rewardPointsOrderService.validateRedeemRequest(
                ctx,
                customer.id,
                args.points
            );

            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid redeem request');
            }

            // Apply redemption to order
            const updatedOrder = await this.rewardPointsOrderService.applyPointsRedemptionToOrder(
                ctx,
                activeOrder,
                args.points
            );

            // Actually redeem the points (deduct from balance)
            await this.rewardPointsService.redeemPoints(
                ctx,
                customer.id,
                args.points,
                updatedOrder.id,
                `Redeemed ${args.points} points for order ${updatedOrder.code}`
            );

            // Return updated order
            const finalOrder = await this.orderService.findOne(ctx, updatedOrder.id);
            if (!finalOrder) {
                throw new Error('Order not found after redemption');
            }

            return finalOrder;
        } catch (error) {
            Logger.error(
                `Failed to redeem points: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiRewardPointsResolver.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Resolve customer field
     */
    @ResolveField()
    async customer(
        @Ctx() ctx: RequestContext,
        @Parent() customerRewardPoints: CustomerRewardPoints
    ): Promise<Customer | null> {
        try {
            // Customer relation should be loaded automatically
            return (customerRewardPoints as any).customer || null;
        } catch (error) {
            return null;
        }
    }
}

