import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger, RequestContext } from '@vendure/core';
import { BundleJobQueueService } from './bundle-job-queue.service';

/**
 * Bundle Scheduler Service
 * 
 * Phase 4.3 Implementation - Bundle Plugin v2
 * 
 * This service schedules automated maintenance tasks by enqueueing jobs
 * in Vendure's job queue system. All jobs are visible in Admin → System → Jobs.
 * 
 * Cron Jobs:
 * - Nightly consistency check (2 AM UTC daily)
 * - Weekly maintenance (3 AM UTC Sunday)
 * 
 * Features:
 * - Uses Vendure's JobQueueService for visibility
 * - All jobs appear in Admin UI
 * - Built-in retry and error handling
 * - Manual trigger support for admin
 */

@Injectable()
export class BundleSchedulerService {
    private static readonly loggerCtx = 'BundleSchedulerService';
    
    constructor(
        private bundleJobQueueService: BundleJobQueueService
    ) {}
    
    /**
     * Nightly consistency check - runs every day at 2 AM UTC
     * This will appear in Admin → System → Jobs as "bundle-consistency-check" 
     */
    @Cron('0 2 * * *', {
        name: 'bundle-nightly-consistency-check',
        timeZone: 'UTC'
    })
    async runNightlyConsistencyCheck(): Promise<void> {
        Logger.info('Scheduling nightly bundle consistency check', BundleSchedulerService.loggerCtx);
        
        try {
            // Enqueue job so it appears in Admin UI
            const jobId = await this.bundleJobQueueService.scheduleConsistencyCheck(
                RequestContext.empty(), // System context
                'active', // Check all active bundles
                {
                    fixBrokenBundles: true,
                    notifyAdmins: true
                }
            );
            
            Logger.info(
                `Nightly consistency check job queued: ${jobId}`,
                BundleSchedulerService.loggerCtx
            );
            
        } catch (error) {
            Logger.error(
                `Failed to schedule nightly consistency check: ${error instanceof Error ? error.message : String(error)}`,
                BundleSchedulerService.loggerCtx
            );
        }
    }
    
    /**
     * Weekly maintenance - runs every Sunday at 3 AM UTC
     * This will appear in Admin → System → Jobs
     */
    @Cron('0 3 * * 0', {
        name: 'bundle-weekly-maintenance',
        timeZone: 'UTC'
    })
    async runWeeklyMaintenance(): Promise<void> {
        Logger.info('Starting weekly bundle maintenance', BundleSchedulerService.loggerCtx);
        
        try {
            // Comprehensive consistency check including ALL bundles
            const jobId = await this.bundleJobQueueService.scheduleConsistencyCheck(
                RequestContext.empty(),
                'all', // Check all bundles regardless of status
                {
                    fixBrokenBundles: true,
                    notifyAdmins: true
                }
            );
            
            Logger.info(
                `Weekly maintenance consistency check job queued: ${jobId}`,
                BundleSchedulerService.loggerCtx
            );
            
        } catch (error) {
            Logger.error(
                `Weekly maintenance failed: ${error instanceof Error ? error.message : String(error)}`,
                BundleSchedulerService.loggerCtx
            );
        }
    }
    
    // Manual triggers for admin interface
    
    /**
     * Manual consistency check trigger
     * Returns job ID so admin can track progress in System → Jobs
     */
    async triggerConsistencyCheck(
        scope: 'all' | 'active' | 'broken' = 'active'
    ): Promise<{
        jobId: string;
        message: string;
    }> {
        const jobId = await this.bundleJobQueueService.scheduleConsistencyCheck(
            RequestContext.empty(),
            scope,
            { fixBrokenBundles: true, notifyAdmins: false }
        );
        
        return {
            jobId,
            message: `Consistency check job queued for ${scope} bundles. View progress in System → Jobs.`
        };
    }
    
    /**
     * Emergency consistency check for critical issues
     */
    async runEmergencyConsistencyCheck(scope: 'all' | 'active' | 'broken' = 'broken'): Promise<string> {
        Logger.warn(
            `Running emergency bundle consistency check: scope=${scope}`,
            BundleSchedulerService.loggerCtx
        );
        
        const jobId = await this.bundleJobQueueService.scheduleConsistencyCheck(
            RequestContext.empty(),
            scope,
            {
                fixBrokenBundles: true,
                notifyAdmins: true
            }
        );
        
        return jobId;
    }
    
    /**
     * Bulk bundle recomputation
     */
    async runBulkRecomputation(bundleIds: string[], batchSize = 10): Promise<string[]> {
        Logger.info(
            `Starting bulk bundle recomputation: ${bundleIds.length} bundles`,
            BundleSchedulerService.loggerCtx
        );
        
        const jobIds: string[] = [];
        
        // Process in batches to avoid overwhelming the system
        for (let i = 0; i < bundleIds.length; i += batchSize) {
            const batch = bundleIds.slice(i, i + batchSize);
            
            const jobId = await this.bundleJobQueueService.scheduleBulkOperation(
                RequestContext.empty(),
                'recompute',
                batch,
                {
                    batchSize,
                    continueOnError: true
                }
            );
            
            jobIds.push(jobId);
        }
        
        Logger.info(
            `Bulk recomputation scheduled: ${jobIds.length} batch jobs created. View in System → Jobs.`,
            BundleSchedulerService.loggerCtx
        );
        
        return jobIds;
    }
    
    /**
     * Manual recompute single bundle
     */
    async recomputeBundle(
        bundleId: string, 
        options: {
            reason?: string;
            forceRecalculation?: boolean;
            updateSearch?: boolean;
        } = {}
    ): Promise<string> {
        return this.bundleJobQueueService.scheduleRecomputeBundle(
            RequestContext.empty(),
            bundleId,
            {
                reason: options.reason || 'Manual recomputation',
                forceRecalculation: options.forceRecalculation ?? false,
                updateSearch: options.updateSearch ?? false
            }
        );
    }
    
    /**
     * Manual reindex bundle 
     */
    async reindexBundle(bundleId: string, fullReindex = false): Promise<string> {
        return this.bundleJobQueueService.scheduleReindexBundle(
            RequestContext.empty(),
            bundleId,
            {
                reason: 'Manual reindex request',
                fullReindex
            }
        );
    }
}