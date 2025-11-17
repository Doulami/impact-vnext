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
    EntityHydrator,
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
        private entityHydrator: EntityHydrator,
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
     * Returns a result object instead of Order to avoid hydration issues
     */
    @Mutation()
    @Transaction()
    async redeemPoints(
        @Ctx() ctx: RequestContext,
        @Args() args: { points: number }
    ): Promise<{ success: boolean; message?: string; pointsRedeemed?: number; discountValue?: number }> {
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
                throw new Error('No active order found. Please add items to your cart first.');
            }

            // Hydrate order with lines relation to avoid hydration errors
            await this.entityHydrator.hydrate(ctx, activeOrder, { relations: ['lines'] });

            // Validate redeem request
            const validation = await this.rewardPointsOrderService.validateRedeemRequest(
                ctx,
                customer.id,
                args.points
            );

            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid redeem request');
            }

            // Get current available points for logging
            const availablePoints = await this.rewardPointsService.getAvailablePoints(ctx, customer.id);
            const currentBalance = (await this.rewardPointsService.getCustomerBalance(ctx, customer.id)).balance;
            
            // Apply points reservation to order (don't deduct from balance yet)
            await this.rewardPointsOrderService.applyPointsRedemptionToOrder(
                ctx,
                activeOrder,
                args.points
            );

            // Note: Points are RESERVED, not redeemed yet
            // They will be actually deducted when payment is confirmed (in event handlers)
            
            Logger.info(
                `[CHECKOUT] Reserved points for order ${activeOrder.code}: ` +
                `customerId=${customer.id}, pointsReserved=${args.points}, ` +
                `balanceBefore=${currentBalance}, availableBefore=${availablePoints}, ` +
                `balanceAfter=${currentBalance} (unchanged), discountValue=${validation.redeemValue}`,
                ShopApiRewardPointsResolver.loggerCtx
            );

            // Return success result - frontend will refetch activeOrder
            return {
                success: true,
                message: `Successfully redeemed ${args.points} points`,
                pointsRedeemed: args.points,
                discountValue: validation.redeemValue || 0
            };
        } catch (error) {
            Logger.error(
                `Failed to redeem points: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiRewardPointsResolver.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Resolve availablePoints field (balance - reserved in pending orders)
     */
    @ResolveField()
    async availablePoints(
        @Ctx() ctx: RequestContext,
        @Parent() customerRewardPoints: CustomerRewardPoints
    ): Promise<number> {
        try {
            return await this.rewardPointsService.getAvailablePoints(ctx, customerRewardPoints.customerId);
        } catch (error) {
            Logger.error(
                `Failed to calculate available points: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiRewardPointsResolver.loggerCtx
            );
            // Fallback to balance if calculation fails
            return customerRewardPoints.balance;
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

