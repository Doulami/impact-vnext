import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
    Allow,
    Ctx,
    ID,
    Permission,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { BundleService, CreateBundleInput, UpdateBundleInput } from '../services/bundle.service';
import { Bundle } from '../entities/bundle.entity';

/**
 * Simple Admin API Bundle Resolver for Vendure v3
 * 
 * Handles basic bundle CRUD operations that work with current API
 */
@Resolver('Bundle')
export class SimpleBundleAdminResolver {
    constructor(private bundleService: BundleService) {}

    @Query()
    @Allow(Permission.ReadCatalog)
    async bundles(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: any }
    ): Promise<{ items: Bundle[]; totalItems: number }> {
        return this.bundleService.findAll(ctx, args.options || {});
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async bundle(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<Bundle | null> {
        return this.bundleService.findOne(ctx, args.id);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.CreateCatalog)
    async createBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateBundleInput }
    ): Promise<Bundle> {
        return this.bundleService.create(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async updateBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: UpdateBundleInput }
    ): Promise<Bundle> {
        return this.bundleService.update(ctx, args.input);
    }

    @Mutation()
    @Transaction()
    @Allow(Permission.DeleteCatalog)
    async deleteBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID }
    ): Promise<{ result: string; message?: string }> {
        const result = await this.bundleService.delete(ctx, args.id);
        
        return result;
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async validateBundleStock(
        @Ctx() ctx: RequestContext,
        @Args() args: { bundleId: ID; quantity: number }
    ) {
        const validation = await this.bundleService.validateBundleStock(ctx, args.bundleId, args.quantity);
        
        return {
            valid: validation.isAvailable,
            constrainingVariants: validation.insufficientItems.map(() => ({})), // Placeholder
            maxQuantityAvailable: validation.maxAvailableQuantity,
            message: validation.isAvailable ? 'Stock available' : 'Insufficient stock'
        };
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async bundleAnalytics(
        @Ctx() ctx: RequestContext,
        @Args() args: { bundleId: ID }
    ) {
        const bundle = await this.bundleService.findOne(ctx, args.bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${args.bundleId} not found`);
        }

        const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
        const savings = componentTotal - bundle.price;
        const savingsPercentage = componentTotal > 0 ? (savings / componentTotal) * 100 : 0;

        const stockValidation = await this.bundleService.validateBundleStock(ctx, args.bundleId, 1);

        return {
            bundleId: bundle.id,
            totalComponents: bundle.items.length,
            componentTotal,
            bundlePrice: bundle.price,
            totalSavings: savings,
            savingsPercentage: Math.round(savingsPercentage * 100) / 100,
            totalWeight: 0, // Placeholder
            enabled: bundle.enabled,
            availabilityStatus: {
                valid: stockValidation.isAvailable,
                constrainingVariants: [],
                maxQuantityAvailable: stockValidation.maxAvailableQuantity,
                message: stockValidation.isAvailable ? 'Available' : 'Insufficient stock'
            }
        };
    }
}