import { Injector, Logger, ScheduledTask, TransactionalConnection, Product } from '@vendure/core';
import { IsNull } from 'typeorm';
import { Bundle, BundleStatus } from '../entities/bundle.entity';
import { BundleService } from '../services/bundle.service';

/**
 * Bundle Cleanup Scheduled Task
 * 
 * Runs every 15 minutes to:
 * 1. Clean up orphaned bundles (bundles with no linked product)
 * 2. Sync shell products for expired bundles (computed state, not DB status)
 * 
 * Visible in Admin UI: Settings → Scheduled tasks
 * 
 * This replaces the NestJS @Cron decorator with Vendure's ScheduledTask system
 * for better visibility and management.
 */
export const autoExpireBundlesTask = new ScheduledTask({
    id: 'bundle-cleanup',
    description: 'Cleans up orphaned bundles and syncs shell products',
    schedule: cron => cron.every(15).minutes(), // Every 15 minutes
    
    async execute({ injector }) {
        const connection = injector.get(TransactionalConnection);
        
        Logger.info('Running bundle cleanup task...', 'BundleCleanupTask');
        
        try {
            let orphansDeleted = 0;
            let errorCount = 0;
            
            // Step 1: Find and delete orphaned bundles
            // Orphaned = bundles with no linked product (shellProductId is null or product doesn't exist)
            const allBundles = await connection.rawConnection
                .getRepository(Bundle)
                .find({ relations: [] });
            
            for (const bundle of allBundles) {
                try {
                    // Check if bundle has a shell product
                    if (!bundle.shellProductId) {
                        Logger.warn(
                            `Found orphaned bundle ${bundle.id} (${bundle.name}) - no shellProductId`,
                            'BundleCleanupTask'
                        );
                        await connection.rawConnection.getRepository(Bundle).delete(bundle.id);
                        orphansDeleted++;
                        continue;
                    }
                    
                    // Check if shell product exists
                    const shellProduct = await connection.rawConnection
                        .getRepository(Product)
                        .findOne({ where: { id: bundle.shellProductId } });
                    
                    if (!shellProduct) {
                        Logger.warn(
                            `Found orphaned bundle ${bundle.id} (${bundle.name}) - shell product ${bundle.shellProductId} deleted`,
                            'BundleCleanupTask'
                        );
                        await connection.rawConnection.getRepository(Bundle).delete(bundle.id);
                        orphansDeleted++;
                        continue;
                    }
                    
                } catch (error) {
                    errorCount++;
                    Logger.error(
                        `Failed to clean bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                        'BundleCleanupTask'
                    );
                }
            }
            
            Logger.info(
                `Bundle cleanup complete: ${orphansDeleted} orphans deleted, ${errorCount} errors`,
                'BundleCleanupTask'
            );
            
            return {
                orphansDeleted,
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

