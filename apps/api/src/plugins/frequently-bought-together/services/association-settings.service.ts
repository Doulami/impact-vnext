import { Injectable } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import { AssociationSettings } from '../entities/association-settings.entity';

/**
 * AssociationSettingsService
 * 
 * Manages the singleton AssociationSettings entity.
 * Ensures settings exist with defaults and provides CRUD operations.
 */
@Injectable()
export class AssociationSettingsService {
    constructor(
        private connection: TransactionalConnection
    ) {}

    /**
     * Get settings (create with defaults if not exists)
     */
    async getSettings(): Promise<AssociationSettings> {
        const repo = this.connection.getRepository(AssociationSettings);
        
        // Try to find existing settings
        let settings = await repo.findOne({ where: {} });
        
        if (!settings) {
            // Create default settings
            settings = repo.create(AssociationSettings.getDefaults());
            settings = await repo.save(settings);
        }
        
        return settings;
    }

    /**
     * Update settings
     */
    async updateSettings(input: Partial<AssociationSettings>): Promise<AssociationSettings> {
        const repo = this.connection.getRepository(AssociationSettings);
        
        // Get existing settings
        let settings = await this.getSettings();
        
        // Update fields
        settings = repo.merge(settings, input);
        
        // Validate
        const errors = settings.validate();
        if (errors.length > 0) {
            throw new Error(`Invalid settings: ${errors.join(', ')}`);
        }
        
        // Save
        return await repo.save(settings);
    }

    /**
     * Reset settings to defaults
     */
    async resetToDefaults(): Promise<AssociationSettings> {
        const repo = this.connection.getRepository(AssociationSettings);
        
        // Get existing settings
        let settings = await this.getSettings();
        
        // Reset to defaults
        const defaults = AssociationSettings.getDefaults();
        settings = repo.merge(settings, defaults);
        
        return await repo.save(settings);
    }

    /**
     * Update calculation stats after job runs
     */
    async updateCalculationStats(
        associationsCount: number,
        durationMs: number
    ): Promise<AssociationSettings> {
        const repo = this.connection.getRepository(AssociationSettings);
        
        let settings = await this.getSettings();
        settings.lastCalculation = new Date();
        settings.lastCalculationDurationMs = durationMs;
        settings.lastCalculationAssociationsCount = associationsCount;
        
        return await repo.save(settings);
    }
}
