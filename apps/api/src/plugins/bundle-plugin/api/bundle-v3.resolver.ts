import {
    Resolver,
    Query,
    Mutation,
    Args,
} from '@nestjs/graphql';
import {
    Ctx,
    RequestContext,
    Allow,
    Permission,
    ID,
    Order,
    ErrorResult,
    OrderService,
    ProductVariantService,
    Logger,
} from '@vendure/core';
import { BundleService } from '../services/bundle.service';
import { Bundle } from '../entities/bundle.entity';

/**
 * Shop API Bundle Resolver for Vendure v3
 * 
 * Handles bundle queries and order mutations with proper v3 API compatibility
 */
@Resolver('Bundle')
export class ShopApiBundleResolver {
    private static readonly loggerCtx = 'ShopApiBundleResolver';

    constructor(
        private bundleService: BundleService,
        private orderService: OrderService,
        private productVariantService: ProductVariantService,
    ) {}

    @Query()
    async bundle(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<Bundle | null> {
        return this.bundleService.findOne(ctx, args.id);
    }

    @Query()  
    async bundles(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: any }
    ): Promise<{ items: Bundle[]; totalItems: number }> {
        return this.bundleService.findAll(ctx, args.options || {});
    }

    /**
     * Add bundle to order - simplified for v3 compatibility
     * Note: Full exploded bundle implementation requires OrderService v3 updates
     */
    @Mutation()
    async addBundleToOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { bundleId: ID; quantity: number }
    ): Promise<Order | ErrorResult> {
        try {
            // Validate bundle exists and is enabled
            const bundle = await this.bundleService.findOne(ctx, args.bundleId);
            if (!bundle) {
                return {
                    __typename: 'OrderModificationError',
                    errorCode: 'ORDER_MODIFICATION_ERROR',
                    message: `Bundle with id ${args.bundleId} not found`
                } as ErrorResult;
            }

            if (!bundle.enabled) {
                return {
                    __typename: 'OrderModificationError', 
                    errorCode: 'ORDER_MODIFICATION_ERROR',
                    message: 'Bundle is not available'
                } as ErrorResult;
            }

            // Validate stock availability
            const stockValidation = await this.bundleService.validateBundleStock(
                ctx,
                args.bundleId,
                args.quantity
            );

            if (!stockValidation.isAvailable) {
                const errorMessage = stockValidation.insufficientItems
                    .map(item => `${item.productName}: need ${item.required}, have ${item.available}`)
                    .join(', ');
                    
                return {
                    __typename: 'InsufficientStockError',
                    errorCode: 'INSUFFICIENT_STOCK_ERROR',
                    message: `Insufficient stock for bundle components: ${errorMessage}`
                } as ErrorResult;
            }

            // For now, return a placeholder response since OrderService v3 API needs research
            Logger.warn(
                'Bundle functionality requires OrderService v3 API updates - returning placeholder',
                ShopApiBundleResolver.loggerCtx
            );

            return {
                __typename: 'OrderModificationError',
                errorCode: 'ORDER_MODIFICATION_ERROR',
                message: 'Bundle functionality coming soon - OrderService v3 integration in progress'
            } as ErrorResult;

        } catch (error) {
            Logger.error(
                `Error adding bundle to order: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiBundleResolver.loggerCtx
            );
            
            return {
                __typename: 'OrderModificationError',
                errorCode: 'ORDER_MODIFICATION_ERROR',
                message: 'Failed to add bundle to order'
            } as ErrorResult;
        }
    }

    /**
     * Adjust bundle quantity in order - placeholder for v3 compatibility
     */
    @Mutation()
    async adjustBundleInOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { orderLineId: ID; quantity: number }
    ): Promise<Order | ErrorResult> {
        Logger.warn(
            'Bundle adjustment requires OrderService v3 API updates - returning placeholder',
            ShopApiBundleResolver.loggerCtx
        );

        return {
            __typename: 'OrderModificationError',
            errorCode: 'ORDER_MODIFICATION_ERROR', 
            message: 'Bundle adjustment coming soon - OrderService v3 integration in progress'
        } as ErrorResult;
    }

    /**
     * Remove bundle from order - placeholder for v3 compatibility
     */
    @Mutation()
    async removeBundleFromOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { orderLineId: ID }
    ): Promise<Order | ErrorResult> {
        Logger.warn(
            'Bundle removal requires OrderService v3 API updates - returning placeholder',
            ShopApiBundleResolver.loggerCtx
        );

        return {
            __typename: 'OrderModificationError',
            errorCode: 'ORDER_MODIFICATION_ERROR',
            message: 'Bundle removal coming soon - OrderService v3 integration in progress'
        } as ErrorResult;
    }
}

/**
 * Admin API Bundle Resolver for Vendure v3
 * Note: The admin operations use the existing resolver from bundle-admin.resolver.ts
 */
@Resolver()
export class AdminApiBundleResolver {
    constructor(private bundleService: BundleService) {}

    @Query()
    @Allow(Permission.ReadOrder)
    async detectBundleOpportunitiesInOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { orderId: ID }
    ) {
        // Placeholder for bundle opportunity detection
        Logger.verbose(
            'Bundle opportunity detection requires order analysis integration',
            'AdminApiBundleResolver'
        );
        return [];
    }

    @Query()
    @Allow(Permission.ReadOrder)
    async getBundleUsageStats(@Ctx() ctx: RequestContext) {
        // Placeholder for bundle usage statistics
        Logger.verbose(
            'Bundle usage statistics require analytics integration',
            'AdminApiBundleResolver'
        );
        return {
            totalBundlesSold: 0,
            topPerformingBundles: [],
            averageSavingsPerBundle: 0,
            bundleConversionRate: 0,
        };
    }
}