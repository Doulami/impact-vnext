import { Injectable, OnModuleInit } from '@nestjs/common';
import { 
    Logger, 
    OrderLine, 
    Promotion, 
    RequestContext,
    EventBus,
    PromotionService,
    Order
} from '@vendure/core';
import { ModuleRef } from '@nestjs/core';
import { BundlePromotionGuardService } from '../services/bundle-promotion-guard.service';
import { BundlePluginConfig } from '../types/bundle-config.types';

/**
 * Bundle Promotion Interceptor
 * 
 * Phase 3.2 Implementation - Bundle Plugin v2
 * 
 * This interceptor integrates with Vendure's promotion system to apply
 * the bundle promotion guard logic. It intercepts promotion calculations
 * and filters out bundle components based on the configured policies.
 * 
 * Integration Points:
 * - Hooks into Vendure's promotion evaluation pipeline
 * - Filters OrderLines before promotion application
 * - Provides logging and statistics for promotion decisions
 * - Maintains compatibility with existing promotion actions
 */
@Injectable()
export class BundlePromotionInterceptor implements OnModuleInit {
    private static readonly loggerCtx = 'BundlePromotionInterceptor';
    private promotionService: PromotionService;
    private originalCalculatePromotions: any;
    private guardService: BundlePromotionGuardService;
    private config: BundlePluginConfig;
    
    constructor(
        private moduleRef: ModuleRef,
        private eventBus: EventBus
    ) {
        this.guardService = new BundlePromotionGuardService();
    }
    
    async onModuleInit() {
        // Use require to avoid ESM module resolution issues
        // This is safe because we only need to read static config
        try {
            const bundlePluginModule = require('../bundle.plugin');
            const BundlePlugin = bundlePluginModule.BundlePlugin;
            this.config = BundlePlugin.getConfig();
            this.guardService.setConfig(this.config);
        } catch (error) {
            // Fallback to default config if plugin not available yet
            const { defaultBundlePluginConfig } = require('../types/bundle-config.types');
            this.config = defaultBundlePluginConfig;
            this.guardService.setConfig(this.config);
            Logger.warn(
                'Could not load BundlePlugin config, using defaults',
                BundlePromotionInterceptor.loggerCtx
            );
        }
        
        // Get the PromotionService after module initialization
        this.promotionService = this.moduleRef.get(PromotionService);
        
        // Intercept the promotion calculation method
        await this.interceptPromotionCalculation();
        
        Logger.debug(
            `Bundle promotion interceptor initialized with policy: ${this.config.siteWidePromosAffectBundles}`,
            BundlePromotionInterceptor.loggerCtx
        );
    }
    
    /**
     * Set the bundle plugin configuration
     */
    setConfig(config: Partial<BundlePluginConfig>) {
        // Import at runtime to avoid circular dependency
        const { defaultBundlePluginConfig } = require('../types/bundle-config.types');
        this.config = { ...defaultBundlePluginConfig, ...config };
        this.guardService.setConfig(this.config);
    }
    
    /**
     * Intercept Vendure's promotion calculation pipeline
     */
    private async interceptPromotionCalculation() {
        if (!this.promotionService) {
            Logger.warn('PromotionService not available for interception', BundlePromotionInterceptor.loggerCtx);
            return;
        }
        
        // Store the original method
        this.originalCalculatePromotions = this.promotionService.runPromotionSideEffects;
        
        // Replace with our intercepted version
        this.promotionService.runPromotionSideEffects = async (
            ctx: RequestContext,
            order: Order,
            promotionsPre: Promotion[]
        ) => {
            // Apply bundle promotion filtering
            const filteredPromotions = await this.filterPromotionsForOrder(ctx, order, promotionsPre);
            
            // Call the original method with filtered promotions
            return this.originalCalculatePromotions.call(
                this.promotionService,
                ctx,
                order,
                filteredPromotions
            );
        };
        
        Logger.debug('Promotion calculation method intercepted', BundlePromotionInterceptor.loggerCtx);
    }
    
    /**
     * Filter promotions based on bundle guard policies
     */
    private async filterPromotionsForOrder(
        ctx: RequestContext,
        order: Order,
        promotions: Promotion[]
    ): Promise<Promotion[]> {
        if (!promotions.length || !order.lines.length) {
            return promotions;
        }
        
        const filteredPromotions: Promotion[] = [];
        
        for (const promotion of promotions) {
            // Check if this promotion should be filtered
            const shouldInclude = await this.shouldIncludePromotion(
                ctx,
                order.lines,
                promotion
            );
            
            if (shouldInclude) {
                filteredPromotions.push(promotion);
            } else if (this.config.logPromotionGuardDecisions) {
                Logger.debug(
                    `Filtering out promotion '${promotion.name}' (${promotion.couponCode || 'auto'}) - blocked by bundle guard`,
                    BundlePromotionInterceptor.loggerCtx
                );
            }
        }
        
        // Log summary if enabled
        if (this.config.logPromotionGuardDecisions && promotions.length !== filteredPromotions.length) {
            Logger.info(
                `Bundle promotion guard filtered ${promotions.length - filteredPromotions.length} of ${promotions.length} promotions for order ${order.code}`,
                BundlePromotionInterceptor.loggerCtx
            );
        }
        
        return filteredPromotions;
    }
    
    /**
     * Determine if a promotion should be included based on bundle lines
     */
    private async shouldIncludePromotion(
        ctx: RequestContext,
        orderLines: OrderLine[],
        promotion: Promotion
    ): Promise<boolean> {
        // Check if promotion applies to any bundle lines
        const guardResults = await this.guardService.shouldPromotionApplyToOrder(
            ctx,
            orderLines,
            promotion
        );
        
        // If promotion is blocked for ALL bundle lines and there are no non-bundle lines,
        // then exclude the promotion entirely
        const bundleLines = orderLines.filter(line => {
            const customFields = (line as any).customFields;
            return !!(customFields?.bundleKey);
        });
        
        const nonBundleLines = orderLines.filter(line => {
            const customFields = (line as any).customFields;
            return !(customFields?.bundleKey);
        });
        
        // If there are non-bundle lines, always include the promotion
        // (it can apply to those lines)
        if (nonBundleLines.length > 0) {
            return true;
        }
        
        // If there are only bundle lines, include promotion only if at least
        // one bundle line allows it
        if (bundleLines.length > 0 && guardResults.allowedLines.length === 0) {
            // All bundle lines blocked this promotion
            return false;
        }
        
        return true;
    }
    
    /**
     * Alternative integration: Filter order lines for specific promotions
     * 
     * This method can be called directly by promotion actions that need
     * to filter lines before applying discounts.
     */
    async filterOrderLinesForPromotion(
        ctx: RequestContext,
        orderLines: OrderLine[],
        promotion: Promotion
    ): Promise<{
        allowedLines: OrderLine[];
        blockedLines: OrderLine[];
        statistics: any;
    }> {
        const results = await this.guardService.shouldPromotionApplyToOrder(
            ctx,
            orderLines,
            promotion
        );
        
        const statistics = this.guardService.getGuardStatistics(results.results);
        
        return {
            allowedLines: results.allowedLines,
            blockedLines: results.blockedLines,
            statistics
        };
    }
    
    /**
     * Check if a single order line should receive a promotion
     */
    async shouldLineReceivePromotion(
        ctx: RequestContext,
        orderLine: OrderLine,
        promotion: Promotion
    ): Promise<boolean> {
        const result = await this.guardService.shouldPromotionApplyToBundleLine(
            ctx,
            orderLine,
            promotion
        );
        
        return result.allowed;
    }
    
    /**
     * Get detailed guard result for a single order line
     */
    async getLineGuardResult(
        ctx: RequestContext,
        orderLine: OrderLine,
        promotion: Promotion
    ) {
        return this.guardService.shouldPromotionApplyToBundleLine(
            ctx,
            orderLine,
            promotion
        );
    }
    
    /**
     * Restore the original promotion calculation method (for cleanup)
     */
    async restoreOriginalPromotionCalculation() {
        if (this.originalCalculatePromotions && this.promotionService) {
            this.promotionService.runPromotionSideEffects = this.originalCalculatePromotions;
            Logger.debug('Original promotion calculation method restored', BundlePromotionInterceptor.loggerCtx);
        }
    }
    
    /**
     * Get statistics about promotion guard decisions across an order
     */
    async getOrderPromotionStatistics(
        ctx: RequestContext,
        order: Order,
        promotions: Promotion[]
    ): Promise<{
        orderCode: string;
        totalPromotions: number;
        totalLines: number;
        bundleLines: number;
        promotionResults: Array<{
            promotionName: string;
            promotionCode?: string;
            allowedLines: number;
            blockedLines: number;
            statistics: any;
        }>;
    }> {
        const results = [];
        
        for (const promotion of promotions) {
            const guardResults = await this.guardService.shouldPromotionApplyToOrder(
                ctx,
                order.lines,
                promotion
            );
            
            const statistics = this.guardService.getGuardStatistics(guardResults.results);
            
            results.push({
                promotionName: promotion.name,
                promotionCode: promotion.couponCode,
                allowedLines: guardResults.allowedLines.length,
                blockedLines: guardResults.blockedLines.length,
                statistics
            });
        }
        
        const bundleLineCount = order.lines.filter(line => {
            const customFields = (line as any).customFields;
            return !!(customFields?.bundleKey);
        }).length;
        
        return {
            orderCode: order.code,
            totalPromotions: promotions.length,
            totalLines: order.lines.length,
            bundleLines: bundleLineCount,
            promotionResults: results
        };
    }
}
