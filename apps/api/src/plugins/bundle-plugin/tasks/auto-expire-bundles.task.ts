import { Injector, Logger, ScheduledTask, TransactionalConnection } from '@vendure/core';
import { LessThanOrEqual } from 'typeorm';
import { Bundle, BundleStatus } from '../entities/bundle.entity';
import { BundleService } from '../services/bundle.service';

/**
 * Auto-Expire Bundles Scheduled Task
 * 
 * Runs every 15 minutes to automatically set bundle status to EXPIRED when validTo passes.
 * Visible in Admin UI: Settings → Scheduled tasks
 * 
 * This replaces the NestJS @Cron decorator with Vendure's ScheduledTask system
 * for better visibility and management.
 */
export const autoExpireBundlesTask = new ScheduledTask({
    id: 'auto-expire-bundles',
    description: 'Automatically expires bundles when validTo date passes',
    schedule: cron => cron.every(15).minutes(),
    
    async execute({ injector }) {
        const connection = injector.get(TransactionalConnection);
        const bundleService = injector.get(BundleService);
        const now = new Date();
        
        Logger.info('Running auto-expire bundles task...', 'AutoExpireBundlesTask');
        
        try {
            // Find all bundles that:
            // 1. Have validTo <= now (expired)
            // 2. Status is ACTIVE (not already expired/broken/archived)
            const expiredBundles = await connection.rawConnection
                .getRepository(Bundle)
                .createQueryBuilder('bundle')
                .where('bundle.validTo <= :now', { now })
                .andWhere('bundle.status = :status', { status: BundleStatus.ACTIVE })
                .getMany();
            
            if (expiredBundles.length === 0) {
                Logger.info('No expired bundles found', 'AutoExpireBundlesTask');
                return { processed: 0, expired: 0, errors: 0 };
            }
            
            Logger.info(
                `Found ${expiredBundles.length} expired bundles to process`,
                'AutoExpireBundlesTask'
            );
            
            let successCount = 0;
            let errorCount = 0;
            
            for (const bundle of expiredBundles) {
                try {
                    // Set status to EXPIRED
                    bundle.status = BundleStatus.EXPIRED;
                    bundle.enabled = false;
                    
                    await connection.rawConnection
                        .getRepository(Bundle)
                        .save(bundle);
                    
                    // Trigger recompute to sync shell product
                    try {
                        const ctx = await createContext(connection);
                        await bundleService.recomputeBundle(ctx, bundle.id);
                    } catch (syncError) {
                        Logger.warn(
                            `Failed to sync shell for expired bundle ${bundle.id}: ${syncError instanceof Error ? syncError.message : String(syncError)}`,
                            'AutoExpireBundlesTask'
                        );
                    }
                    
                    Logger.info(
                        `Expired bundle ${bundle.id} (${bundle.name}), validTo: ${bundle.validTo}`,
                        'AutoExpireBundlesTask'
                    );
                    successCount++;
                    
                } catch (error) {
                    errorCount++;
                    Logger.error(
                        `Failed to expire bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                        'AutoExpireBundlesTask'
                    );
                }
            }
            
            Logger.info(
                `Auto-expire complete: ${successCount} expired, ${errorCount} errors`,
                'AutoExpireBundlesTask'
            );
            
            return {
                processed: expiredBundles.length,
                expired: successCount,
                errors: errorCount
            };
            
        } catch (error) {
            Logger.error(
                `Auto-expire task failed: ${error instanceof Error ? error.message : String(error)}`,
                'AutoExpireBundlesTask'
            );
            throw error;
        }
    }
});

/**
 * Create a basic RequestContext for background operations
 */
async function createContext(connection: TransactionalConnection) {
    const channel = await connection.rawConnection
        .getRepository('channel')
        .findOne({ where: { code: 'default' } });
    
    if (!channel) {
        throw new Error('Default channel not found');
    }
    
    // Use a minimal RequestContext for background tasks
    const { RequestContext } = await import('@vendure/core');
    return RequestContext.empty();
}
