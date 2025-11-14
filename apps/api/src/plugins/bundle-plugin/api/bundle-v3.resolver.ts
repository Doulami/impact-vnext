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
    Allow,
    Permission,
    ID,
    Order,
    OrderLine,
    ErrorResult,
    OrderService,
    ActiveOrderService,
    ProductVariantService,
    ProductService,
    Logger,
    TransactionalConnection,
} from '@vendure/core';
import { BundleService } from '../services/bundle.service';
import { BundleOrderService } from '../services/bundle-order.service';
import { BundleLifecycleService } from '../services/bundle-lifecycle.service';
import { BundleSafetyService } from '../services/bundle-safety.service';
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
        private activeOrderService: ActiveOrderService,
        private productVariantService: ProductVariantService,
        private productService: ProductService,
        private connection: TransactionalConnection,
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
        // Only show ACTIVE bundles in shop API
        const queryOptions = {
            ...args.options,
            filter: {
                ...args.options?.filter,
                status: { eq: 'ACTIVE' }
            }
        };
        return this.bundleService.findAll(ctx, queryOptions);
    }

    @ResolveField()
    async shellProduct(
        @Ctx() ctx: RequestContext,
        @Parent() bundle: Bundle
    ) {
        if (!bundle.shellProductId) {
            return null;
        }
        
        try {
            const product = await this.productService.findOne(ctx, bundle.shellProductId);
            return product;
        } catch (error) {
            Logger.warn(
                `Failed to resolve shell product ${bundle.shellProductId} for bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiBundleResolver.loggerCtx
            );
            return null;
        }
    }
    
    @Query()
    async bundleAvailability(
        @Ctx() ctx: RequestContext, 
        @Args() args: { bundleId: ID }
    ): Promise<{
        isAvailable: boolean;
        maxQuantity: number;
        status: string;
        reason?: string;
    }> {
        return this.bundleService.getBundleAvailability(ctx, args.bundleId);
    }

    /**
     * Add bundle to order using Bundle Plugin v2 implementation
     * Uses BundleService.addBundleToOrder with proper shell header + pricing
     */
    @Mutation()
    async addBundleToOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { bundleId: ID; quantity: number }
    ): Promise<Order> {
        try {
            // PHASE 4: Validate bundle availability with A_final check
            const availability = await this.bundleService.getBundleAvailability(ctx, args.bundleId);
            
            // Check if bundle is available at all
            if (!availability.isAvailable) {
                throw new Error(availability.reason || 'Bundle is not available');
            }
            
            // Check if requested quantity exceeds A_final
            if (args.quantity > availability.maxQuantity) {
                throw new Error(`Only ${availability.maxQuantity} bundles available. Requested: ${args.quantity}`);
            }
            
            // Get or create active order
            let activeOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            
            // CRITICAL FIX: If order exists but is in wrong state, create new order
            // This prevents ORDER_MODIFICATION_ERROR when user has stale order from previous session
            if (activeOrder && activeOrder.state !== 'AddingItems') {
                Logger.warn(
                    `Active order ${activeOrder.code} is in '${activeOrder.state}' state, not 'AddingItems'. Creating new order.`,
                    ShopApiBundleResolver.loggerCtx
                );
                // Create a fresh order instead of trying to reuse the stale one
                activeOrder = await this.orderService.create(ctx, ctx.activeUserId);
            } else if (!activeOrder) {
                // Create a new order if none exists
                activeOrder = await this.orderService.create(ctx, ctx.activeUserId);
            }

            // Use BundleService Phase 2.3 implementation
            const result = await this.bundleService.addBundleToOrder(
                ctx,
                activeOrder.id,
                args.bundleId,
                args.quantity
            );

            if (!result.success) {
                if (result.availabilityError) {
                    const errorMessage = result.availabilityError.insufficientItems
                        .map(item => `${item.productName}: need ${item.required}, have ${item.available}`)
                        .join(', ');
                    throw new Error(`Insufficient stock: ${errorMessage}`);
                }
                
                throw new Error(result.error || 'Failed to add bundle to order');
            }

            // Add child component lines ONLY (no shell header)
            // Shell product is used only for SEO, capacity, and UI reconstruction
            if (result.childLines) {
                // Add each child component line with full bundle metadata
                for (const childLine of result.childLines) {
                    // Step 1: Add item to order (creates OrderLine)
                    const addResult = await this.orderService.addItemToOrder(
                        ctx,
                        activeOrder.id,
                        childLine.productVariantId!,
                        childLine.quantity!
                    );
                    
                    // Handle error results
                    if ('errorCode' in addResult) {
                        throw new Error(`Failed to add item ${childLine.productVariantId}: ${addResult.message}`);
                    }
                    
                    // Step 2: Find the newly created OrderLine and update its customFields
                    // The new line will be the one with this variant that doesn't have bundleKey yet
                    const newLine = addResult.lines.find((line: any) => 
                        line.productVariantId === childLine.productVariantId &&
                        !line.customFields?.bundleKey
                    );
                    
                    if (newLine && childLine.customFields) {
                        Logger.log(
                            `Updating OrderLine ${newLine.id} with customFields: ${JSON.stringify(childLine.customFields)}`,
                            ShopApiBundleResolver.loggerCtx
                        );
                        // Update customFields directly on the OrderLine
                        await this.connection.getRepository(ctx, OrderLine).update(
                            newLine.id,
                            { customFields: childLine.customFields as any }
                        );
                        Logger.log(`OrderLine ${newLine.id} customFields updated successfully`, ShopApiBundleResolver.loggerCtx);
                    } else {
                        Logger.warn(
                            `Could not update customFields: newLine=${!!newLine}, hasCustomFields=${!!childLine.customFields}`,
                            ShopApiBundleResolver.loggerCtx
                        );
                    }
                }
            }

            // Return updated order
            const updatedOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            return updatedOrder!;

        } catch (error) {
            Logger.error(
                `Error adding bundle to order: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiBundleResolver.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Adjust bundle quantity in order - Bundle Plugin v2 implementation
     * Uses BundleService.adjustBundleInOrder with proper pricing recalculation
     */
    @Mutation()
    async adjustBundleInOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { bundleKey: string; quantity: number }
    ): Promise<Order | ErrorResult> {
        try {
            const activeOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            if (!activeOrder) {
                return {
                    __typename: 'OrderModificationError',
                    errorCode: 'ORDER_MODIFICATION_ERROR',
                    message: 'No active order found'
                } as ErrorResult;
            }
            
            // PHASE 4: Find bundleId from existing order lines
            const existingBundleLine = activeOrder.lines.find(
                line => (line as any).customFields?.bundleKey === args.bundleKey
            );
            
            if (existingBundleLine && (existingBundleLine as any).customFields?.bundleId) {
                const bundleId = (existingBundleLine as any).customFields.bundleId;
                
                // Revalidate availability with A_final check
                const availability = await this.bundleService.getBundleAvailability(ctx, bundleId);
                
                // If quantity > 0, validate availability
                if (args.quantity > 0) {
                    if (!availability.isAvailable) {
                        return {
                            __typename: 'OrderModificationError',
                            errorCode: 'BUNDLE_NOT_AVAILABLE',
                            message: availability.reason || 'Bundle is no longer available'
                        } as ErrorResult;
                    }
                    
                    if (args.quantity > availability.maxQuantity) {
                        return {
                            __typename: 'InsufficientStockError',
                            errorCode: 'INSUFFICIENT_STOCK_ERROR',
                            message: `Only ${availability.maxQuantity} bundles available. Requested: ${args.quantity}`
                        } as ErrorResult;
                    }
                }
            }

            // Use BundleService Phase 2.3 implementation
            const result = await this.bundleService.adjustBundleInOrder(
                ctx,
                activeOrder.id,
                args.bundleKey,
                args.quantity
            );

            if (!result.success) {
                return {
                    __typename: 'OrderModificationError',
                    errorCode: 'ORDER_MODIFICATION_ERROR',
                    message: result.error || 'Failed to adjust bundle in order'
                } as ErrorResult;
            }

            // Handle removal case (quantity = 0)
            if (result.operation === 'removed') {
                // Find and remove all existing bundle lines
                const bundleLines = activeOrder.lines.filter(
                    line => (line as any).customFields?.bundleKey === args.bundleKey
                );
                
                for (const line of bundleLines) {
                    await this.orderService.removeItemFromOrder(ctx, activeOrder.id, line.id);
                }
            } else if (result.operation === 'updated' && result.childLines) {
                // Remove existing bundle lines first
                const existingBundleLines = activeOrder.lines.filter(
                    line => (line as any).customFields?.bundleKey === args.bundleKey
                );
                
                for (const line of existingBundleLines) {
                    await this.orderService.removeItemFromOrder(ctx, activeOrder.id, line.id);
                }
                
                // Add updated child lines with recalculated pricing (no header)
                for (const childLine of result.childLines) {
                    await this.orderService.addItemToOrder(
                        ctx,
                        activeOrder.id,
                        childLine.productVariantId!,
                        childLine.quantity!,
                        childLine.customFields
                    );
                }
            }

            const updatedOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            return updatedOrder!;

        } catch (error) {
            Logger.error(
                `Error adjusting bundle in order: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiBundleResolver.loggerCtx
            );
            
            return {
                __typename: 'OrderModificationError',
                errorCode: 'ORDER_MODIFICATION_ERROR',
                message: 'Failed to adjust bundle in order'
            } as ErrorResult;
        }
    }

    /**
     * Remove bundle from order - Bundle Plugin v2 implementation
     * Uses BundleService.removeBundleFromOrder for proper cleanup
     */
    @Mutation()
    async removeBundleFromOrder(
        @Ctx() ctx: RequestContext,
        @Args() args: { bundleKey: string }
    ): Promise<Order | ErrorResult> {
        try {
            const activeOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            if (!activeOrder) {
                return {
                    __typename: 'OrderModificationError',
                    errorCode: 'ORDER_MODIFICATION_ERROR',
                    message: 'No active order found'
                } as ErrorResult;
            }

            // Use BundleService Phase 2.3 implementation
            const result = await this.bundleService.removeBundleFromOrder(
                ctx,
                activeOrder.id,
                args.bundleKey
            );

            if (!result.success) {
                return {
                    __typename: 'OrderModificationError',
                    errorCode: 'ORDER_MODIFICATION_ERROR',
                    message: result.error || 'Failed to remove bundle from order'
                } as ErrorResult;
            }

            // Find all order lines with the specified bundleKey and remove them
            const bundleLines = activeOrder.lines.filter(
                line => (line as any).customFields?.bundleKey === args.bundleKey
            );

            for (const line of bundleLines) {
                await this.orderService.removeItemFromOrder(ctx, activeOrder.id, line.id);
            }

            const updatedOrder = await this.activeOrderService.getActiveOrder(ctx, {});
            return updatedOrder!;

        } catch (error) {
            Logger.error(
                `Error removing bundle from order: ${error instanceof Error ? error.message : String(error)}`,
                ShopApiBundleResolver.loggerCtx
            );
            
            return {
                __typename: 'OrderModificationError',
                errorCode: 'ORDER_MODIFICATION_ERROR',
                message: 'Failed to remove bundle from order'
            } as ErrorResult;
        }
    }
}

/**
 * Admin API Bundle Resolver for Vendure v3
 * Note: The admin operations use the existing resolver from bundle-admin.resolver.ts
 */
@Resolver('Bundle')
export class AdminApiBundleResolver {
    constructor(
        private bundleService: BundleService,
        private bundleLifecycleService: BundleLifecycleService,
        private bundleSafetyService: BundleSafetyService,
        private productService: ProductService
    ) {}

    @ResolveField()
    async shellProduct(
        @Ctx() ctx: RequestContext,
        @Parent() bundle: Bundle
    ) {
        if (!bundle.shellProductId) {
            return null;
        }
        
        try {
            const product = await this.productService.findOne(ctx, bundle.shellProductId);
            return product;
        } catch (error) {
            Logger.warn(
                `Failed to resolve shell product ${bundle.shellProductId} for bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                'AdminApiBundleResolver'
            );
            return null;
        }
    }

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
        return []; // Returns AdminBundleOpportunity[]
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
            reportingPeriod: 'Last 30 days'
        }; // Returns AdminBundleUsageStats
    }
    
    // Phase 4.2: Bundle Lifecycle Management Mutations
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async publishBundle(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) {
        return this.bundleLifecycleService.publishBundle(ctx, args.id);
    }
    
    @Mutation() 
    @Allow(Permission.UpdateCatalog)
    async archiveBundle(@Ctx() ctx: RequestContext, @Args() args: { id: ID; reason?: string }) {
        return this.bundleLifecycleService.archiveBundle(ctx, args.id, args.reason);
    }
    
    @Mutation()
    @Allow(Permission.UpdateCatalog) 
    async markBundleBroken(@Ctx() ctx: RequestContext, @Args() args: { id: ID; reason: string }) {
        return this.bundleLifecycleService.markBundleBroken(ctx, args.id, args.reason);
    }
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async restoreBundle(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) {
        return this.bundleLifecycleService.restoreBundle(ctx, args.id);
    }
    
    // Phase 4.2: Bundle Validation and Safety Queries
    
    // Temporarily commented out due to GraphQL schema conflicts
    // These will be re-enabled once shared types are properly structured
    /*
    @Query()
    @Allow(Permission.ReadCatalog)
    async validateBundleIntegrity(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) {
        return this.bundleSafetyService.validateBundleIntegrity(ctx, args.id);
    }
    
    @Query()
    @Allow(Permission.ReadCatalog)
    async canDeleteVariant(@Ctx() ctx: RequestContext, @Args() args: { variantId: ID }) {
        return this.bundleSafetyService.canDeleteVariant(ctx, args.variantId);
    }
    
    @Query()
    @Allow(Permission.ReadCatalog) 
    async getBundleLifecycleStatistics(@Ctx() ctx: RequestContext) {
        return this.bundleLifecycleService.getLifecycleStatistics(ctx);
    }
    */
}