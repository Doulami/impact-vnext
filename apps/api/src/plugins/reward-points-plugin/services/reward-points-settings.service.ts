import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    Logger,
} from '@vendure/core';
import { RewardPointSettings } from '../entities/reward-point-settings.entity';

/**
 * Reward Points Settings Service
 * 
 * Manages global reward points settings with singleton pattern enforcement.
 * Ensures only one settings record exists (ID=1).
 */
@Injectable()
export class RewardPointsSettingsService {
    private static readonly loggerCtx = 'RewardPointsSettingsService';
    private static readonly SINGLETON_ID = '1';

    constructor(
        private connection: TransactionalConnection,
    ) {}

    /**
     * Get or create default settings
     * Enforces singleton pattern - always returns/creates record with ID=1
     */
    async getSettings(ctx: RequestContext): Promise<RewardPointSettings> {
        const repo = this.connection.getRepository(ctx, RewardPointSettings);
        
        // Try to find existing settings
        let settings = await repo.findOne({ where: { id: RewardPointsSettingsService.SINGLETON_ID } });
        
        if (!settings) {
            // Create default settings if none exist
            Logger.info('Creating default reward points settings', RewardPointsSettingsService.loggerCtx);
            settings = new RewardPointSettings({
                id: RewardPointsSettingsService.SINGLETON_ID,
                enabled: false,
                earnRate: 1.0,
                redeemRate: 0.01,
                minRedeemAmount: 100,
                maxRedeemPerOrder: 10000,
            });
            settings = await repo.save(settings);
        }
        
        return settings;
    }

    /**
     * Update settings
     * Updates the singleton settings record
     */
    async updateSettings(
        ctx: RequestContext,
        input: {
            enabled?: boolean;
            earnRate?: number;
            redeemRate?: number;
            minRedeemAmount?: number;
            maxRedeemPerOrder?: number;
        }
    ): Promise<RewardPointSettings> {
        const repo = this.connection.getRepository(ctx, RewardPointSettings);
        
        // Get existing settings
        const settings = await this.getSettings(ctx);
        
        // Validate input values
        if (input.earnRate !== undefined && input.earnRate <= 0) {
            throw new Error('Earn rate must be greater than 0');
        }
        
        if (input.redeemRate !== undefined && input.redeemRate <= 0) {
            throw new Error('Redeem rate must be greater than 0');
        }
        
        if (input.minRedeemAmount !== undefined && input.minRedeemAmount < 0) {
            throw new Error('Min redeem amount cannot be negative');
        }
        
        if (input.maxRedeemPerOrder !== undefined && input.maxRedeemPerOrder < 0) {
            throw new Error('Max redeem per order cannot be negative');
        }
        
        if (input.minRedeemAmount !== undefined && input.maxRedeemPerOrder !== undefined) {
            if (input.minRedeemAmount > input.maxRedeemPerOrder) {
                throw new Error('Min redeem amount cannot be greater than max redeem per order');
            }
        }
        
        // Update settings
        if (input.enabled !== undefined) {
            settings.enabled = input.enabled;
        }
        if (input.earnRate !== undefined) {
            settings.earnRate = input.earnRate;
        }
        if (input.redeemRate !== undefined) {
            settings.redeemRate = input.redeemRate;
        }
        if (input.minRedeemAmount !== undefined) {
            settings.minRedeemAmount = input.minRedeemAmount;
        }
        if (input.maxRedeemPerOrder !== undefined) {
            settings.maxRedeemPerOrder = input.maxRedeemPerOrder;
        }
        
        const updated = await repo.save(settings);
        
        Logger.info(
            `Updated reward points settings: enabled=${updated.enabled}, earnRate=${updated.earnRate}, redeemRate=${updated.redeemRate}`,
            RewardPointsSettingsService.loggerCtx
        );
        
        return updated;
    }

    /**
     * Check if reward points feature is enabled
     */
    async isEnabled(ctx: RequestContext): Promise<boolean> {
        const settings = await this.getSettings(ctx);
        return settings.enabled;
    }
}

