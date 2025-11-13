import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobQueue, JobQueueService, Logger, RequestContext, TransactionalConnection } from '@vendure/core';
import { Bundle, BundleStatus } from '../entities/bundle.entity';
import { BundleService } from '../services/bundle.service';
import { LessThanOrEqual } from 'typeorm';

/**
 * Auto-Expire Bundles Job
 * 
 * Background job that automatically sets bundle status to EXPIRED when validTo passes.
 * Runs periodically to check for expired bundles and:
 * 1. Set bundle.status = EXPIRED (if currently ACTIVE)
 * 2. Call syncBundleToShell() to disable shell product
 * 3. Keep warning messages intact
 * 
 * Idempotent: Safe to run multiple times on same bundle
 */
@Injectable()
export class AutoExpireBundlesJob implements OnModuleInit {
    private jobQueue: JobQueue<{ dryRun: boolean }> | undefined;
    private isProcessing = false;

    constructor(
        private connection: TransactionalConnection,
        private bundleService: BundleService,
        private jobQueueService: JobQueueService
    ) {}

    async onModuleInit() {
        this.jobQueue = await this.jobQueueService.createQueue({
            name: 'auto-expire-bundles',
            process: async (job) => {
                const { dryRun = false } = job.data;
                
                if (this.isProcessing) {
                    Logger.info('Auto-expire job already running, skipping', 'AutoExpireBundlesJob');
                    return { skipped: true };
                }

                this.isProcessing = true;
                try {
                    return await this.processExpiredBundles(dryRun);
                } finally {
                    this.isProcessing = false;
                }
            }
        });

        Logger.info('Auto-expire bundles job queue created', 'AutoExpireBundlesJob');
    }

    /**
     * Manually trigger the expiry check
     */
    async triggerExpireCheck(dryRun: boolean = false): Promise<void> {
        if (!this.jobQueue) {
            throw new Error('Job queue not initialized');
        }

        await this.jobQueue.add({ dryRun }, { retries: 3 });
        Logger.info(`Auto-expire check triggered (dryRun=${dryRun})`, 'AutoExpireBundlesJob');
    }

    /**
     * Process all expired bundles
     */
    private async processExpiredBundles(dryRun: boolean): Promise<{
        checked: number;
        expired: number;
        errors: number;
        bundles: Array<{ id: number; name: string; validTo: Date }>;
    }> {
        const ctx = await this.createContext();
        const now = new Date();

        Logger.info(`Checking for expired bundles (dryRun=${dryRun})...`, 'AutoExpireBundlesJob');

        try {
            // Find all bundles that:
            // 1. Have validTo <= now (expired)
            // 2. Status is ACTIVE (not already expired/broken/archived)
            const expiredBundles = await this.connection.getRepository(ctx, Bundle).find({
                where: {
                    validTo: LessThanOrEqual(now),
                    status: BundleStatus.ACTIVE
                },
                relations: ['items']
            });

            Logger.info(
                `Found ${expiredBundles.length} expired bundles to process`,
                'AutoExpireBundlesJob'
            );

            const result = {
                checked: expiredBundles.length,
                expired: 0,
                errors: 0,
                bundles: [] as Array<{ id: number; name: string; validTo: Date }>
            };

            for (const bundle of expiredBundles) {
                try {
                    if (dryRun) {
                        Logger.info(
                            `[DRY RUN] Would expire bundle ${bundle.id} (${bundle.name}), validTo: ${bundle.validTo}`,
                            'AutoExpireBundlesJob'
                        );
                    } else {
                        await this.expireBundle(ctx, bundle);
                        Logger.info(
                            `Expired bundle ${bundle.id} (${bundle.name}), validTo: ${bundle.validTo}`,
                            'AutoExpireBundlesJob'
                        );
                    }

                    result.expired++;
                    result.bundles.push({
                        id: Number(bundle.id),
                        name: bundle.name,
                        validTo: bundle.validTo!
                    });

                } catch (error) {
                    result.errors++;
                    Logger.error(
                        `Failed to expire bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                        'AutoExpireBundlesJob'
                    );
                }
            }

            Logger.info(
                `Auto-expire complete: ${result.expired} expired, ${result.errors} errors`,
                'AutoExpireBundlesJob'
            );

            return result;

        } catch (error) {
            Logger.error(
                `Auto-expire job failed: ${error instanceof Error ? error.message : String(error)}`,
                'AutoExpireBundlesJob'
            );
            throw error;
        }
    }

    /**
     * Expire a single bundle
     * - Set status to EXPIRED
     * - Keep brokenReason/customFields intact (don't clear warnings)
     * - Call recomputeBundle to trigger syncBundleToShell
     */
    private async expireBundle(ctx: RequestContext, bundle: Bundle): Promise<void> {
        // Set status to EXPIRED
        bundle.status = BundleStatus.EXPIRED;
        bundle.enabled = false; // Backwards compatibility

        // Save bundle
        await this.connection.getRepository(ctx, Bundle).save(bundle);

        // Trigger recompute which will call syncBundleToShell
        // This will disable the shell product automatically
        try {
            await this.bundleService.recomputeBundle(ctx, bundle.id);
        } catch (error) {
            // Log but don't fail - status change is more important
            Logger.warn(
                `Failed to recompute expired bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                'AutoExpireBundlesJob'
            );
        }
    }

    /**
     * Create a RequestContext for background processing
     */
    private async createContext(): Promise<RequestContext> {
        // Get default channel for background job context
        const channel = await this.connection.rawConnection
            .getRepository('channel')
            .findOne({ where: { code: 'default' } });

        if (!channel) {
            throw new Error('Default channel not found');
        }

        return RequestContext.empty();
    }
}
