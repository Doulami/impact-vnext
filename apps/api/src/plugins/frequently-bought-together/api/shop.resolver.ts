import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, Product, RequestContext } from '@vendure/core';
import { AssociationSettingsService } from '../services/association-settings.service';
import { RecommendationService } from '../services/recommendation.service';
import { DisplayContext } from '../types/association.types';

/**
 * Shop API Resolver for Frequently Bought Together Plugin
 * 
 * Provides queries for storefront to fetch product recommendations.
 */
@Resolver()
export class FrequentlyBoughtTogetherShopResolver {
    constructor(
        private settingsService: AssociationSettingsService,
        private recommendationService: RecommendationService
    ) {}

    /**
     * Get recommendations for a single product
     * Used in PDP (product detail page) contexts
     */
    @Query()
    async frequentlyBoughtTogether(
        @Ctx() ctx: RequestContext,
        @Args('productId') productId: string,
        @Args('context') context?: string
    ): Promise<Product[]> {
        try {
            // Get settings
            const settings = await this.settingsService.getSettings();
            
            // Check if enabled
            if (!settings.enabled) {
                return [];
            }

            // Parse context (default to PDP_RELATED if not provided)
            const displayContext = context as DisplayContext || DisplayContext.PDP_RELATED;

            // Check if this display location is enabled
            const locationEnabled = this.isLocationEnabled(displayContext, settings);
            if (!locationEnabled) {
                return [];
            }

            // Get recommendations
            return await this.recommendationService.getForProduct(
                productId,
                displayContext,
                settings
            );

        } catch (error) {
            console.error('Failed to get recommendations:', error);
            return [];
        }
    }

    /**
     * Get recommendations for cart (multiple products)
     * Used in cart and checkout pages
     */
    @Query()
    async cartRecommendations(
        @Ctx() ctx: RequestContext,
        @Args('productIds') productIds: string[]
    ): Promise<Product[]> {
        try {
            // Get settings
            const settings = await this.settingsService.getSettings();
            
            // Check if enabled
            if (!settings.enabled) {
                return [];
            }

            // Check if cart page is enabled
            if (!settings.cartPage) {
                return [];
            }

            // Get recommendations
            return await this.recommendationService.getForCart(
                productIds,
                settings
            );

        } catch (error) {
            console.error('Failed to get cart recommendations:', error);
            return [];
        }
    }

    /**
     * Check if display location is enabled in settings
     */
    private isLocationEnabled(context: DisplayContext, settings: any): boolean {
        switch (context) {
            case DisplayContext.PDP_RELATED:
                return settings.pdpRelatedSection;
            case DisplayContext.PDP_ADD_TO_CART:
                return settings.pdpUnderAddToCart;
            case DisplayContext.CART:
                return settings.cartPage;
            case DisplayContext.CHECKOUT:
                return settings.checkoutPage;
            default:
                return false;
        }
    }
}
