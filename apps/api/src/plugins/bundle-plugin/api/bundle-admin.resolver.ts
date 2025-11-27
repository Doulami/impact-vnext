import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { Transaction, Allow, Permission, RequestContext, ID, Logger, Ctx } from '@vendure/core';
import { BundleService } from '../services/bundle.service';
import { BundleConfigService } from '../services/bundle-config.service';
import { Bundle } from '../entities/bundle.entity';
import { BundleTranslationService } from '../services/bundle-translation.service';

/**
 * Bundle Admin API Resolver (Clean Version)
 * 
 * Provides admin-only GraphQL operations for Bundle management
 * Focused on core CRUD operations without GraphQL schema conflicts
 */
@Resolver()
export class BundleAdminResolver {
    private static readonly loggerCtx = 'BundleAdminResolver';

    constructor(
        private bundleService: BundleService,
        private bundleConfigService: BundleConfigService,
        private translationService: BundleTranslationService
    ) {}

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

    /**
     * Create a new bundle
     * Validates component variants and creates bundle with items
     */
    @Mutation()
    @Transaction()
    @Allow(Permission.CreateCatalog)
    async createBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: any }
    ): Promise<Bundle> {
        try {
            // Validate bundle data according to documentation rules
            this.validateBundleInput(args.input);
            
            return await this.bundleService.create(ctx, args.input);
        } catch (error) {
            throw new Error(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to create bundle'
            );
        }
    }

    /**
     * Update an existing bundle
     * Handles bundle property updates and component modifications
     */
    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async updateBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: any }
    ): Promise<Bundle> {
        try {
            // Validate bundle data if items are being updated
            if (args.input.items) {
                this.validateBundleItems(args.input.items);
            }

            const result = await this.bundleService.update(ctx, args.input);
            return result;
        } catch (error) {
            throw new Error(
                error instanceof Error 
                    ? error.message 
                    : 'Failed to update bundle'
            );
        }
    }

    /**
     * Delete a bundle
     * Removes bundle and all associated bundle items
     */
    @Mutation()
    @Transaction()
    @Allow(Permission.DeleteCatalog)
    async deleteBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID }
    ): Promise<{ result: string; message?: string }> {
        try {
            const result = await this.bundleService.delete(ctx, args.id);
            
            return result;
        } catch (error) {
            return {
                result: 'NOT_DELETED' as any,
                message: error instanceof Error ? error.message : 'Failed to delete bundle',
            };
        }
    }

    /**
     * Activate a product as a bundle
     * Sets isBundle=true and links/creates bundle
     */
    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async activateProductAsBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { productId: ID }
    ): Promise<{ success: boolean; message?: string }> {
        try {
            await this.bundleService.activateProductAsBundle(ctx, args.productId);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to activate bundle'
            };
        }
    }

    /**
     * Remove a product bundle
     * Hard deletes bundle entity and clears isBundle/bundleId fields
     */
    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateCatalog)
    async removeProductBundle(
        @Ctx() ctx: RequestContext,
        @Args() args: { productId: ID; bundleId: ID }
    ): Promise<{ success: boolean; message?: string }> {
        try {
            await this.bundleService.removeProductBundle(ctx, args.productId, args.bundleId);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to remove bundle'
            };
        }
    }

    /**
     * Get current bundle configuration settings
     */
    @Query()
    @Allow(Permission.ReadSettings)
    async bundleConfig(@Ctx() ctx: RequestContext): Promise<any> {
        return this.bundleConfigService.getConfig(ctx);
    }

    /**
     * Update bundle configuration settings (runtime configurable)
     */
    @Mutation()
    @Transaction()
    @Allow(Permission.UpdateSettings)
    async updateBundleConfig(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: any }
    ): Promise<any> {
        try {
            return await this.bundleConfigService.updateConfig(ctx, args.input);
        } catch (error) {
            throw new Error(
                error instanceof Error
                    ? error.message
                    : 'Failed to update bundle configuration'
            );
        }
    }

    /**
     * Private validation methods following documentation specifications
     * Updated for Bundle v2 schema with discountType, fixedPrice, percentOff
     */
    private validateBundleInput(input: any): void {
        // Component uniqueness validation
        const variantIds = input.items.map((item: any) => item.productVariantId);
        const uniqueVariantIds = new Set(variantIds);
        if (variantIds.length !== uniqueVariantIds.size) {
            throw new Error('Duplicate variants in bundle - each component must be unique');
        }

        // Bundle size validation
        if (input.items.length === 0) {
            throw new Error('Bundle must contain at least one component');
        }

        if (input.items.length > 10) { // maxBundleSize from documentation
            throw new Error('Bundle cannot contain more than 10 components');
        }

        // Bundle v2 discount validation
        if (!input.discountType) {
            throw new Error('Discount type is required (fixed or percent)');
        }

        if (input.discountType === 'fixed') {
            if (!input.fixedPrice || input.fixedPrice <= 0) {
                throw new Error('Fixed price must be positive (in cents)');
            }
        } else if (input.discountType === 'percent') {
            if (input.percentOff === undefined || input.percentOff === null) {
                throw new Error('Percentage off is required for percent discount type');
            }
            if (input.percentOff < 0 || input.percentOff > 100) {
                throw new Error('Percentage off must be between 0 and 100');
            }
        } else {
            throw new Error('Discount type must be either "fixed" or "percent"');
        }

        // Validate component quantities
        for (const item of input.items) {
            if (item.quantity <= 0) {
                throw new Error('Component quantities must be positive');
            }
            // unitPrice is optional - service will fetch current price from variant
            if (item.unitPrice !== undefined && item.unitPrice < 0) {
                throw new Error('Component unit prices cannot be negative');
            }
        }

        // Name and slug are synced from shell product - no validation needed
    }

    private validateBundleItems(items: any[]): void {
        // Component uniqueness validation
        const variantIds = items.map(item => item.productVariantId);
        const uniqueVariantIds = new Set(variantIds);
        if (variantIds.length !== uniqueVariantIds.size) {
            throw new Error('Duplicate variants in bundle - each component must be unique');
        }

        // Bundle size validation
        if (items.length === 0) {
            throw new Error('Bundle must contain at least one component');
        }

        if (items.length > 10) {
            throw new Error('Bundle cannot contain more than 10 components');
        }

        // Validate component quantities and prices
        for (const item of items) {
            if (item.quantity <= 0) {
                throw new Error('Component quantities must be positive');
            }
            // unitPrice is optional - service will fetch current price from variant
            if (item.unitPrice !== undefined && item.unitPrice < 0) {
                throw new Error('Component unit prices cannot be negative');
            }
        }
    }
}

/**
 * Bundle Entity Field Resolver
 * Resolves computed properties on Bundle entity
 */
@Resolver('Bundle')
export class BundleEntityResolver {
    @ResolveField()
    isExpired(@Parent() bundle: Bundle): boolean {
        return bundle.isExpired;
    }

    @ResolveField()
    isBroken(@Parent() bundle: Bundle): boolean {
        return bundle.isBroken;
    }

    @ResolveField()
    isAvailable(@Parent() bundle: Bundle): boolean {
        return bundle.isAvailable;
    }
}

/**
 * Additional Admin API resolver for bundle-related operations
 * Placeholder for future extensions
 */
@Resolver()
export class AdminApiBundleResolver {
    constructor(private bundleService: BundleService) {}

    // Methods will be added here once GraphQL schema conflicts are resolved
    // These will include bundle analytics, stock validation, and opportunity detection
}
