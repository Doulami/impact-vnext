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
    Logger,
    Transaction,
    Allow,
    Permission,
    ListQueryBuilder,
    PaginatedList,
    TransactionalConnection,
    CustomerService,
} from '@vendure/core';
import { RewardPointsService } from '../services/reward-points.service';
import { RewardPointsSettingsService } from '../services/reward-points-settings.service';
import { RewardPointSettings } from '../entities/reward-point-settings.entity';
import { CustomerRewardPoints } from '../entities/customer-reward-points.entity';
import { RewardTransaction } from '../entities/reward-transaction.entity';

/**
 * Admin API Reward Points Settings Resolver
 */
@Resolver('RewardPointSettings')
export class AdminRewardPointsSettingsResolver {
    private static readonly loggerCtx = 'AdminRewardPointsSettingsResolver';

    constructor(
        private rewardPointsSettingsService: RewardPointsSettingsService,
    ) {}

    @Query()
    @Allow(Permission.ReadSettings)
    async rewardPointSettings(
        @Ctx() ctx: RequestContext
    ): Promise<RewardPointSettings> {
        return await this.rewardPointsSettingsService.getSettings(ctx);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateSettings)
    async updateRewardPointSettings(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            input: {
                enabled?: boolean;
                earnRate?: number;
                redeemRate?: number;
                minRedeemAmount?: number;
                maxRedeemPerOrder?: number;
            };
        }
    ): Promise<RewardPointSettings> {
        try {
            return await this.rewardPointsSettingsService.updateSettings(ctx, args.input);
        } catch (error) {
            Logger.error(
                `Failed to update reward point settings: ${error instanceof Error ? error.message : String(error)}`,
                AdminRewardPointsSettingsResolver.loggerCtx
            );
            throw error;
        }
    }
}

/**
 * Admin API Customer Reward Points Resolver
 */
@Resolver('CustomerRewardPoints')
export class AdminCustomerRewardPointsResolver {
    private static readonly loggerCtx = 'AdminCustomerRewardPointsResolver';

    constructor(
        private rewardPointsService: RewardPointsService,
        private connection: TransactionalConnection,
        private customerService: CustomerService,
    ) {}

    @Query()
    @Allow(Permission.ReadCustomer)
    async allCustomerRewardPoints(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            options?: {
                skip?: number;
                take?: number;
                filter?: {
                    customerId?: { eq?: string };
                };
            };
        }
    ): Promise<PaginatedList<CustomerRewardPoints>> {
        const skip = args.options?.skip || 0;
        const take = args.options?.take || 20;

        const repo = this.connection.getRepository(ctx, CustomerRewardPoints);
        
        const skipValue = args.options?.skip || 0;
        const takeValue = args.options?.take || 20;

        const qb = repo.createQueryBuilder('crp')
            .leftJoinAndSelect('crp.customer', 'customer')
            .orderBy('crp.createdAt', 'DESC');

        // Apply filters
        if (args.options?.filter?.customerId?.eq) {
            qb.andWhere('crp.customerId = :customerId', {
                customerId: args.options.filter.customerId.eq,
            });
        }

        const [items, totalItems] = await qb
            .skip(skipValue)
            .take(takeValue)
            .getManyAndCount();

        return {
            items,
            totalItems,
        };
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    async customerRewardPoints(
        @Ctx() ctx: RequestContext,
        @Args() args: { customerId: ID }
    ): Promise<CustomerRewardPoints | null> {
        return await this.rewardPointsService.getCustomerBalance(ctx, args.customerId);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCustomer)
    async adjustCustomerPoints(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            input: {
                customerId: ID;
                points: number;
                description: string;
            };
        }
    ): Promise<CustomerRewardPoints> {
        try {
            return await this.rewardPointsService.adjustCustomerPoints(
                ctx,
                args.input.customerId,
                args.input.points,
                args.input.description
            );
        } catch (error) {
            Logger.error(
                `Failed to adjust customer points: ${error instanceof Error ? error.message : String(error)}`,
                AdminCustomerRewardPointsResolver.loggerCtx
            );
            throw error;
        }
    }


    @ResolveField()
    async customer(
        @Ctx() ctx: RequestContext,
        @Parent() customerRewardPoints: CustomerRewardPoints
    ) {
        try {
            if ((customerRewardPoints as any).customer) {
                return (customerRewardPoints as any).customer;
            }
            
            const customer = await this.customerService.findOne(ctx, customerRewardPoints.customerId);
            return customer;
        } catch (error) {
            Logger.warn(
                `Failed to resolve customer for reward points ${customerRewardPoints.id}: ${error instanceof Error ? error.message : String(error)}`,
                AdminCustomerRewardPointsResolver.loggerCtx
            );
            return null;
        }
    }
}

/**
 * Admin API Reward Transaction Resolver
 */
@Resolver('RewardTransaction')
export class AdminRewardTransactionResolver {
    private static readonly loggerCtx = 'AdminRewardTransactionResolver';

    constructor(
        private connection: TransactionalConnection,
        private customerService: CustomerService,
    ) {}

    @Query()
    @Allow(Permission.ReadCustomer)
    async rewardTransactionHistory(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            customerId?: ID;
            options?: {
                skip?: number;
                take?: number;
            };
        }
    ): Promise<PaginatedList<RewardTransaction>> {
        const repo = this.connection.getRepository(ctx, RewardTransaction);
        
        const skip = args.options?.skip || 0;
        const take = args.options?.take || 20;

        const qb = repo.createQueryBuilder('rt')
            .leftJoinAndSelect('rt.customer', 'customer')
            .leftJoinAndSelect('rt.order', 'order')
            .orderBy('rt.createdAt', 'DESC');

        // Filter by customer if provided
        if (args.customerId) {
            qb.andWhere('rt.customerId = :customerId', {
                customerId: String(args.customerId),
            });
        }

        const [items, totalItems] = await qb
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return {
            items,
            totalItems,
        };
    }

    @ResolveField()
    async customer(
        @Ctx() ctx: RequestContext,
        @Parent() transaction: RewardTransaction
    ) {
        try {
            if ((transaction as any).customer) {
                return (transaction as any).customer;
            }
            
            const customer = await this.customerService.findOne(ctx, transaction.customerId);
            return customer;
        } catch (error) {
            return null;
        }
    }

    @ResolveField()
    async order(
        @Ctx() ctx: RequestContext,
        @Parent() transaction: RewardTransaction
    ) {
        try {
            if ((transaction as any).order) {
                return (transaction as any).order;
            }
            
            if (!transaction.orderId) {
                return null;
            }
            
            const order = await this.connection.getRepository(ctx, 'Order').findOne({
                where: { id: transaction.orderId },
            });
            return order;
        } catch (error) {
            return null;
        }
    }
}

