import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { BundleSchedulerService } from '../services/bundle-scheduler.service';

/**
 * Bundle Admin Resolver
 * 
 * Phase 4.3 Implementation - Bundle Plugin v2
 * 
 * Simplified GraphQL resolver for bundle job management that integrates
 * with Vendure's native job system. All jobs are visible in Admin → System → Jobs.
 * 
 * This provides manual triggers for:
 * - Bundle consistency checks
 * - Single bundle recomputation
 * - Bundle reindexing
 * - Bulk operations
 * 
 * Note: Job monitoring is handled by Vendure's built-in Admin UI.
 */

@Resolver()
export class BundleJobQueueResolver {
    
    constructor(
        private bundleSchedulerService: BundleSchedulerService
    ) {}
    
    // Manual job triggers for admin interface
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async triggerBundleConsistencyCheck(
        @Ctx() ctx: RequestContext,
        @Args('scope') scope?: string
    ) {
        const validScope = ['all', 'active', 'broken'].includes(scope || '') ? (scope as 'all' | 'active' | 'broken') : 'active';
        
        const result = await this.bundleSchedulerService.triggerConsistencyCheck(validScope);
        
        return {
            jobId: result.jobId,
            message: result.message
        };
    }
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async recomputeBundle(
        @Ctx() ctx: RequestContext,
        @Args('bundleId') bundleId: string,
        @Args('options') options?: BundleRecomputeOptions
    ) {
        const jobId = await this.bundleSchedulerService.recomputeBundle(
            bundleId,
            {
                reason: options?.reason || 'Manual recomputation',
                forceRecalculation: options?.forceRecalculation || false,
                updateSearch: options?.updateSearch || false
            }
        );
        
        return {
            jobId,
            message: `Bundle recomputation job queued. View progress in System → Jobs.`
        };
    }
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async reindexBundleProduct(
        @Ctx() ctx: RequestContext,
        @Args('bundleId') bundleId: string,
        @Args('fullReindex') fullReindex?: boolean
    ) {
        const jobId = await this.bundleSchedulerService.reindexBundle(
            bundleId,
            fullReindex || false
        );
        
        return {
            jobId,
            message: `Bundle reindex job queued. View progress in System → Jobs.`
        };
    }
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async bulkRecomputeBundles(
        @Ctx() ctx: RequestContext,
        @Args('bundleIds') bundleIds: string[],
        @Args('batchSize') batchSize?: number
    ) {
        const jobIds = await this.bundleSchedulerService.runBulkRecomputation(
            bundleIds, 
            batchSize || 10
        );
        
        return {
            jobIds,
            totalBundles: bundleIds.length,
            batchCount: jobIds.length,
            message: `Bulk recomputation jobs queued. View progress in System → Jobs.`
        };
    }
    
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async emergencyBundleConsistencyCheck(
        @Ctx() ctx: RequestContext,
        @Args('scope') scope?: string
    ) {
        const validScope = ['all', 'active', 'broken'].includes(scope || '') ? (scope as 'all' | 'active' | 'broken') : 'broken';
        
        const jobId = await this.bundleSchedulerService.runEmergencyConsistencyCheck(validScope);
        
        return {
            jobId,
            message: `Emergency consistency check job queued. View progress in System → Jobs.`
        };
    }
}

// Input types for GraphQL
interface BundleRecomputeOptions {
    forceRecalculation?: boolean;
    updateSearch?: boolean;
    reason?: string;
}