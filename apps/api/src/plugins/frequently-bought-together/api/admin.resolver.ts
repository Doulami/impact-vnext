import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { AssociationSettingsService } from '../services/association-settings.service';
import { AssociationCalculationService } from '../services/association-calculation.service';
import { RecommendationService } from '../services/recommendation.service';
import { AssociationSettings } from '../entities/association-settings.entity';
import { ProductAssociation } from '../entities/product-association.entity';

/**
 * Admin API Resolver for Frequently Bought Together Plugin
 * 
 * Provides queries and mutations for managing settings,
 * triggering calculations, and viewing statistics.
 */
@Resolver()
export class FrequentlyBoughtTogetherAdminResolver {
    constructor(
        private settingsService: AssociationSettingsService,
        private calculationService: AssociationCalculationService,
        private recommendationService: RecommendationService
    ) {}

    /**
     * Get current settings
     */
    @Query()
    @Allow(Permission.ReadSettings)
    async associationSettings(@Ctx() ctx: RequestContext): Promise<AssociationSettings> {
        return await this.settingsService.getSettings();
    }

    /**
     * Update settings
     */
    @Mutation()
    @Allow(Permission.UpdateSettings)
    async updateAssociationSettings(
        @Ctx() ctx: RequestContext,
        @Args('input') input: any
    ): Promise<AssociationSettings> {
        return await this.settingsService.updateSettings(input);
    }

    /**
     * Reset settings to defaults
     */
    @Mutation()
    @Allow(Permission.UpdateSettings)
    async resetAssociationSettings(@Ctx() ctx: RequestContext): Promise<AssociationSettings> {
        return await this.settingsService.resetToDefaults();
    }

    /**
     * Get associations for a specific product (for debugging/analytics)
     */
    @Query()
    @Allow(Permission.ReadCatalog)
    async productAssociations(
        @Ctx() ctx: RequestContext,
        @Args('productId') productId: string
    ): Promise<ProductAssociation[]> {
        const settings = await this.settingsService.getSettings();
        // Note: This returns raw associations, not filtered Products
        // Used for admin analytics/debugging
        const channel = ctx.channel;
        const channelId = String(channel.id);
        
        const repo = this.settingsService['connection'].getRepository(ProductAssociation);
        return await repo.find({
            where: {
                sourceProductId: productId,
                channelId: channelId
            },
            order: {
                finalScore: 'DESC'
            },
            take: 20 // Show more for admin view
        });
    }

    /**
     * Get statistics about associations
     */
    @Query()
    @Allow(Permission.ReadSettings)
    async associationStats(@Ctx() ctx: RequestContext): Promise<any> {
        const settings = await this.settingsService.getSettings();
        const stats = await this.recommendationService.getStats(String(ctx.channel.id));
        
        return {
            ...stats,
            lastCalculated: settings.lastCalculation,
            lastCalculationDurationMs: settings.lastCalculationDurationMs,
            lastCalculationAssociationsCount: settings.lastCalculationAssociationsCount,
            enabled: settings.enabled
        };
    }

    /**
     * Manually trigger association calculation
     */
    @Mutation()
    @Allow(Permission.UpdateSettings)
    async triggerAssociationCalculation(@Ctx() ctx: RequestContext): Promise<any> {
        const settings = await this.settingsService.getSettings();
        
        if (!settings.enabled) {
            return {
                success: false,
                message: 'Association calculation is disabled. Enable it in settings first.'
            };
        }

        try {
            const startTime = Date.now();
            const associationsCount = await this.calculationService.calculateAssociations(settings);
            const duration = Date.now() - startTime;
            
            await this.settingsService.updateCalculationStats(associationsCount, duration);
            
            return {
                success: true,
                associationsCount,
                durationMs: duration
            };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Calculation failed'
            };
        }
    }
}
