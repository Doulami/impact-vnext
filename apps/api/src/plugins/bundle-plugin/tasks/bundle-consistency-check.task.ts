import { Logger, ScheduledTask, TransactionalConnection } from '@vendure/core';
import { Bundle } from '../entities/bundle.entity';
import { BundleService } from '../services/bundle.service';

/**
 * Bundle Consistency Check Scheduled Task
 * 
 * Runs every day at 2 AM to check bundle integrity and log warnings for broken bundles.
 * Visible in Admin UI: Settings → Scheduled tasks
 * 
 * Checks:
 * - Bundles with missing or deleted components (via computed isBroken property)
 * - Logs warnings for broken bundles (they show as broken in UI)
 * - Does not modify database status (broken state is computed)
 */
export const bundleConsistencyCheckTask = new ScheduledTask({
    id: 'bundle-consistency-check',
    description: 'Checks bundle integrity and logs warnings for broken bundles',
    schedule: cron => cron.everyDayAt(0, 0), // Every day at midnight
    
    async execute({ injector }) {
        const connection = injector.get(TransactionalConnection);
        
        Logger.info('Running bundle consistency check...', 'BundleConsistencyCheckTask');
        
        try {
            let checked = 0;
            let brokenCount = 0;
            let errorCount = 0;
            
            // Get all ACTIVE bundles (DRAFT bundles are not checked)
            const activeBundles = await connection.rawConnection
                .getRepository(Bundle)
                .find({ 
                    where: { status: 'ACTIVE' as any },
                    relations: ['items', 'items.productVariant']
                });
            
            for (const bundle of activeBundles) {
                try {
                    checked++;
                    
                    // Check computed broken state
                    if (bundle.isBroken) {
                        brokenCount++;
                        Logger.warn(
                            `Bundle ${bundle.id} has broken components - will show as broken in UI`,
                            'BundleConsistencyCheckTask'
                        );
                    }
                    
                    // Check computed expired state
                    if (bundle.isExpired) {
                        Logger.info(
                            `Bundle ${bundle.id} is expired - will show as expired in UI`,
                            'BundleConsistencyCheckTask'
                        );
                    }
                    
                } catch (error) {
                    errorCount++;
                    Logger.error(
                        `Failed to check bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                        'BundleConsistencyCheckTask'
                    );
                }
            }
            
            Logger.info(
                `Bundle consistency check complete: ${checked} checked, ${brokenCount} broken, ${errorCount} errors`,
                'BundleConsistencyCheckTask'
            );
            
            return {
                checked,
                broken: brokenCount,
                errors: errorCount
            };
            
        } catch (error) {
            Logger.error(
                `Bundle consistency check failed: ${error instanceof Error ? error.message : String(error)}`,
                'BundleConsistencyCheckTask'
            );
            throw error;
        }
    }
});

