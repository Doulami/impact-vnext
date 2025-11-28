import { Logger, ScheduledTask } from '@vendure/core';
import { AssociationCalculationService } from '../services/association-calculation.service';
import { AssociationSettingsService } from '../services/association-settings.service';

/**
 * Calculate Associations Scheduled Task
 * 
 * Analyzes order history and generates product associations.
 * Schedule is configurable via settings (default: daily at 2am).
 * 
 * Visible in Admin UI: Settings → Scheduled tasks
 */
export const calculateAssociationsTask = new ScheduledTask({
    id: 'calculate-associations',
    description: 'Analyzes order history and generates frequently bought together recommendations',
    // Note: Actual schedule is dynamic from settings, this is fallback
    schedule: cron => cron.every(1).days(),
    
    async execute({ injector }) {
        const settingsService = injector.get(AssociationSettingsService);
        const calculationService = injector.get(AssociationCalculationService);
        
        Logger.info('Starting association calculation task...', 'CalculateAssociationsTask');
        
        try {
            // Get settings
            const settings = await settingsService.getSettings();
            
            // Check if enabled
            if (!settings.enabled) {
                Logger.info('Association calculation is disabled in settings, skipping', 'CalculateAssociationsTask');
                return {
                    status: 'skipped',
                    reason: 'disabled'
                };
            }
            
            // Run calculation
            const startTime = Date.now();
            const associationsCount = await calculationService.calculateAssociations(settings);
            const duration = Date.now() - startTime;
            
            // Update settings with stats
            await settingsService.updateCalculationStats(associationsCount, duration);
            
            Logger.info(
                `Association calculation complete: ${associationsCount} associations in ${duration}ms`,
                'CalculateAssociationsTask'
            );
            
            return {
                status: 'success',
                associationsCount,
                durationMs: duration
            };
            
        } catch (error) {
            Logger.error(
                `Association calculation task failed: ${error instanceof Error ? error.message : String(error)}`,
                'CalculateAssociationsTask'
            );
            
            return {
                status: 'error',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
});
