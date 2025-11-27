import { Injectable, OnModuleInit } from '@nestjs/common';
import { 
    Logger,
    EventBus,
    ProductVariantEvent,
    ProductVariantService,
    RequestContext,
    TransactionalConnection,
    ID
} from '@vendure/core';
import { BundleService } from './bundle.service';
import { Bundle } from '../entities/bundle.entity';

/**
 * Bundle Safety Service
 * 
 * Phase 4.1 Implementation - Bundle Plugin v2
 * 
 * This service implements critical safety mechanisms to maintain bundle integrity
 * when ProductVariants are modified, archived, or deleted. It prevents data
 * corruption and ensures bundles remain in consistent states.
 * 
 * Key Features:
 * - Event-driven bundle recomputation when components change
 * - Protection against deleting variants used in active bundles
 * - Bundle lifecycle management and validation
 * 
 * Note: Broken/expired states are computed at runtime (not written to DB)
 */
@Injectable()
export class BundleSafetyService implements OnModuleInit {
    private static readonly loggerCtx = 'BundleSafetyService';
    
    constructor(
        private eventBus: EventBus,
        private bundleService: BundleService,
        private productVariantService: ProductVariantService,
        private connection: TransactionalConnection
    ) {}
    
    async onModuleInit() {
        this.setupEventSubscribers();
        Logger.debug('Bundle safety service initialized with event subscribers', BundleSafetyService.loggerCtx);
    }
    
    /**
     * Set up event subscribers for ProductVariant lifecycle events
     */
    private setupEventSubscribers() {
        // ProductVariant price/stock updates
        this.eventBus.ofType(ProductVariantEvent).subscribe(async (event: ProductVariantEvent) => {
            if (event.type === 'updated') {
                const entity = Array.isArray(event.entity) ? event.entity[0] : event.entity;
                if (entity) {
                    await this.handleVariantUpdated(event.ctx, String(entity.id), entity);
                }
            } else if (event.type === 'deleted') {
                const entity = Array.isArray(event.entity) ? event.entity[0] : event.entity;
                if (entity) {
                    await this.handleVariantDeleted(event.ctx, String(entity.id));
                }
            }
        });
        
        // Additional product events that might affect bundles
        // Note: Simplified to just log since ProductEvent type is not properly available
        Logger.debug('Product event handling is simplified for compatibility', BundleSafetyService.loggerCtx);
    }
    
    /**
     * Handle ProductVariant updated events
     * Recompute affected bundles when variant price/stock changes
     */
    private async handleVariantUpdated(ctx: RequestContext, variantId: ID, variant: any) {
        try {
            // Find all bundles that contain this variant
            const affectedBundles = await this.findBundlesContainingVariant(ctx, variantId);
            
            if (affectedBundles.length === 0) {
                return; // No bundles affected
            }
            
            Logger.debug(
                `Variant ${variantId} updated, recomputing ${affectedBundles.length} affected bundles`,
                BundleSafetyService.loggerCtx
            );
            
            // Check if variant is now archived/disabled
            const isVariantUnavailable = !variant.enabled || variant.deletedAt;
            
            for (const bundle of affectedBundles) {
                if (isVariantUnavailable && bundle.status === 'ACTIVE') {
                    // Log warning - bundle.isBroken will now compute to true at runtime
                    Logger.warn(
                        `Bundle ${bundle.id} component variant ${variantId} is now unavailable - bundle will show as broken`,
                        BundleSafetyService.loggerCtx
                    );
                }
                
            // Queue bundle for recomputation (pricing/availability sync)
                await this.queueBundleRecomputation(ctx, bundle.id, 'variant_updated');
            }
        } catch (error) {
            Logger.error(
                `Error handling variant updated event for variant ${variantId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleSafetyService.loggerCtx
            );
        }
    }
    
    /**
     * Handle ProductVariant deleted events
     * This should be prevented by ON DELETE RESTRICT, but we handle it as a safety net
     */
    private async handleVariantDeleted(ctx: RequestContext, variantId: ID) {
        try {
            const affectedBundles = await this.findBundlesContainingVariant(ctx, variantId);
            
            if (affectedBundles.length > 0) {
                Logger.error(
                    `CRITICAL: Variant ${variantId} was deleted but is used in ${affectedBundles.length} bundles! This should have been prevented by database constraints.`,
                    BundleSafetyService.loggerCtx
                );
                
                // Log all affected bundles - they will show as broken via computed isBroken property
                for (const bundle of affectedBundles) {
                    Logger.error(
                        `Bundle ${bundle.id} (${bundle.shellProduct?.name || 'Unknown'}) will show as broken - component variant ${variantId} was deleted`,
                        BundleSafetyService.loggerCtx
                    );
                }
            }
            
        } catch (error) {
            Logger.error(
                `Error handling variant deleted event for variant ${variantId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleSafetyService.loggerCtx
            );
        }
    }
    
    /**
     * Handle Product deleted events
     */
    private async handleProductDeleted(ctx: RequestContext, productId: ID) {
        // Check if this was a bundle shell product
        const bundlesWithShell = await this.findBundlesWithShellProduct(ctx, productId);
        
        if (bundlesWithShell.length > 0) {
            Logger.warn(
                `Product ${productId} was deleted and was used as shell for ${bundlesWithShell.length} bundles`,
                BundleSafetyService.loggerCtx
            );
            
            for (const bundle of bundlesWithShell) {
                // Clear shell product reference and potentially mark as broken
                await this.handleShellProductDeleted(ctx, bundle.id, productId);
            }
        }
    }
    
    /**
     * Find all bundles that contain a specific variant
     */
    private async findBundlesContainingVariant(ctx: RequestContext, variantId: ID): Promise<Bundle[]> {
        return this.connection.getRepository(ctx, Bundle)
            .createQueryBuilder('bundle')
            .leftJoinAndSelect('bundle.items', 'item')
            .leftJoinAndSelect('item.productVariant', 'variant')
            .leftJoinAndSelect('bundle.shellProduct', 'shellProduct')
            .where('variant.id = :variantId', { variantId })
            .andWhere('bundle.status IN (:...statuses)', { statuses: ['DRAFT', 'ACTIVE'] })
            .getMany();
    }
    
    /**
     * Find bundles that use a specific product as shell
     */
    private async findBundlesWithShellProduct(ctx: RequestContext, productId: ID): Promise<Bundle[]> {
        // This would depend on how shell products are linked to bundles
        // Assuming there's a shellProductId field or similar
        return this.connection.getRepository(ctx, Bundle)
            .createQueryBuilder('bundle')
            .where('bundle.shellProductId = :productId', { productId })
            .getMany();
    }
    
    
    /**
     * Queue bundle for recomputation (price, availability, etc.)
     */
    private async queueBundleRecomputation(ctx: RequestContext, bundleId: ID, reason: string): Promise<void> {
        try {
            // In a real implementation, this would use a job queue
            // For now, we'll do it synchronously with the bundle service
            await this.bundleService.recomputeBundle(ctx, bundleId);
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Logger.error(
                `Failed to recompute bundle ${bundleId}: ${errorMessage}`,
                BundleSafetyService.loggerCtx
            );
            // Bundle will show as broken via computed isBroken if components are unavailable
        }
    }
    
    /**
     * Queue bundle for reindexing (if using search/shell products)
     */
    private async queueBundleReindex(ctx: RequestContext, bundleId: ID, reason: string): Promise<void> {
        // This would integrate with the search indexing system
        Logger.debug(`Bundle ${bundleId} queued for reindex (${reason})`, BundleSafetyService.loggerCtx);
        
        // Log reindex queue instead of complex event
        Logger.debug(
            `Bundle ${bundleId} reindex queued: ${reason}`,
            BundleSafetyService.loggerCtx
        );
    }
    
    /**
     * Handle shell product deletion
     */
    private async handleShellProductDeleted(ctx: RequestContext, bundleId: ID, productId: ID): Promise<void> {
        try {
            // Clear shell product reference
            await this.connection.getRepository(ctx, Bundle)
                .update(bundleId, {
                    // shellProductId: null, // Uncomment if this field exists
                    updatedAt: new Date()
                });
            
            Logger.warn(
                `Shell product ${productId} deleted for bundle ${bundleId}`,
                BundleSafetyService.loggerCtx
            );
            
            // Queue reindex to update search
            await this.queueBundleReindex(ctx, bundleId, 'shell_product_deleted');
            
        } catch (error) {
            Logger.error(
                `Failed to handle shell product deletion for bundle ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleSafetyService.loggerCtx
            );
        }
    }
    
    /**
     * Validate bundle integrity - checks if all components are still available
     */
    async validateBundleIntegrity(ctx: RequestContext, bundleId: ID): Promise<{
        isValid: boolean;
        issues: Array<{
            type: 'missing_variant' | 'archived_variant' | 'disabled_variant';
            variantId: ID;
            message: string;
        }>;
    }> {
        const bundle = await this.bundleService.findOne(ctx, bundleId);
        
        if (!bundle) {
            return {
                isValid: false,
                issues: [{ type: 'missing_variant', variantId: bundleId, message: 'Bundle not found' }]
            };
        }
        
        const issues: any[] = [];
        
        for (const item of bundle.items) {
            const variant = item.productVariant;
            
            if (!variant) {
                issues.push({
                    type: 'missing_variant',
                    variantId: item.productVariant?.id || 'unknown',
                    message: 'Variant not found'
                });
            } else if (variant.deletedAt) {
                issues.push({
                    type: 'archived_variant',
                    variantId: variant.id,
                    message: 'Variant is archived'
                });
            } else if (!variant.enabled) {
                issues.push({
                    type: 'disabled_variant',
                    variantId: variant.id,
                    message: 'Variant is disabled'
                });
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues
        };
    }
    
    /**
     * Perform nightly consistency check on all bundles
     */
    async performConsistencyCheck(ctx: RequestContext): Promise<{
        totalBundles: number;
        brokenBundles: number;
        fixedBundles: number;
        errors: string[];
    }> {
        
        const stats = {
            totalBundles: 0,
            brokenBundles: 0,
            fixedBundles: 0,
            errors: [] as string[]
        };
        
        try {
            // Get all active bundles
            const activeBundles = await this.connection.getRepository(ctx, Bundle)
                .find({ where: { status: 'ACTIVE' as any } });
            
            stats.totalBundles = activeBundles.length;
            
            for (const bundle of activeBundles) {
                try {
                    const validation = await this.validateBundleIntegrity(ctx, bundle.id);
                    
                    if (!validation.isValid) {
                        // Log broken bundles - they will show as broken via computed isBroken property
                        Logger.warn(
                            `Bundle ${bundle.id} (${bundle.shellProduct?.name || 'Unknown'}) failed consistency check: ${validation.issues.map(i => i.message).join(', ')}`,
                            BundleSafetyService.loggerCtx
                        );
                        stats.brokenBundles++;
                    }
                    
                } catch (error) {
                    stats.errors.push(`Bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            Logger.error(
                `Consistency check failed: ${errorMessage}`,
                BundleSafetyService.loggerCtx
            );
            stats.errors.push(`Global error: ${errorMessage}`);
        }
        
        return stats;
    }
    
    /**
     * Check if a variant can be safely deleted (not used in any active bundles)
     */
    async canDeleteVariant(ctx: RequestContext, variantId: ID): Promise<{
        canDelete: boolean;
        blockingBundles: Array<{
            id: ID;
            name: string;
            status: string;
        }>;
    }> {
        const blockingBundles = await this.connection.getRepository(ctx, Bundle)
            .createQueryBuilder('bundle')
            .leftJoinAndSelect('bundle.items', 'item')
            .leftJoinAndSelect('item.productVariant', 'variant')
            .leftJoinAndSelect('bundle.shellProduct', 'shellProduct')
            .where('variant.id = :variantId', { variantId })
            .andWhere('bundle.status IN (:...statuses)', { statuses: ['DRAFT', 'ACTIVE'] })
            .select(['bundle.id', 'bundle.shellProduct', 'bundle.status'])
            .getMany();
        
        return {
            canDelete: blockingBundles.length === 0,
            blockingBundles: blockingBundles.map(b => ({
                id: b.id,
                name: b.shellProduct?.name || 'Unknown',
                status: b.status
            }))
        };
    }
}