import { Injectable } from '@nestjs/common';
import { Logger, OrderLine, Promotion, RequestContext } from '@vendure/core';
import {
    BundlePluginConfig,
    BundlePromotionGuardResult,
    BundlePromotionPolicy,
    PromotionBundleOverride,
    BundleExternalPromosPolicy,
    BundlePromotionMetadata,
    defaultBundlePluginConfig
} from '../types/bundle-config.types';

/**
 * Bundle Promotion Guard Service
 * 
 * Phase 3.2 Implementation - Bundle Plugin v2
 * 
 * This service implements the promotion guard system that controls how external
 * promotions interact with bundle components. It prevents double-discounting and
 * provides fine-grained control over bundle promotion interactions.
 * 
 * Key Features:
 * - GLOBAL POLICY: siteWidePromosAffectBundles setting
 * - PER-PROMOTION OVERRIDES: Promotion-specific bundle policies
 * - PER-BUNDLE OVERRIDES: Bundle-specific external promotion settings
 * - DISCOUNT CAPS: Prevent over-discounting with cumulative limits
 * - PATTERN MATCHING: Exclude/include promotions by code patterns
 */
@Injectable()
export class BundlePromotionGuardService {
    private static readonly loggerCtx = 'BundlePromotionGuardService';
    
    private config: BundlePluginConfig = defaultBundlePluginConfig;
    
    constructor() {}
    
    /**
     * Set the bundle plugin configuration
     */
    setConfig(config: Partial<BundlePluginConfig>) {
        this.config = { ...defaultBundlePluginConfig, ...config };
    }
    
    /**
     * Main guard method: Determine if a promotion should apply to a bundle line
     * 
     * This implements the complete Bundle Plugin v2 promotion guard logic:
     * 1. Check if line is a bundle component
     * 2. Apply global policy
     * 3. Apply per-promotion overrides
     * 4. Apply per-bundle overrides
     * 5. Check exclusion patterns
     * 6. Check whitelist patterns
     * 7. Enforce discount caps
     */
    async shouldPromotionApplyToBundleLine(
        ctx: RequestContext,
        orderLine: OrderLine,
        promotion: Promotion
    ): Promise<BundlePromotionGuardResult> {
        // Check if this is a bundle line
        const customFields = (orderLine as any).customFields;
        const bundleKey = customFields?.bundleKey;
        
        if (!bundleKey) {
            // Not a bundle line - allow promotion
            return this.createResult(true, 'Not a bundle line', 'global');
        }
        
        // Skip header lines (they should not receive promotions)
        if (customFields?.isBundleHeader) {
            return this.createResult(false, 'Bundle header lines do not receive promotions', 'global');
        }
        
        const bundleId = customFields?.bundleId;
        const bundleName = customFields?.bundleName || 'Unknown Bundle';
        const promotionCode = promotion.couponCode || promotion.name;
        
        // Get promotion metadata
        const promotionMetadata = this.getPromotionBundleMetadata(promotion);
        
        // 1. Check exclusion patterns first (highest priority)
        if (this.config.excludedPromotionPatterns && this.config.excludedPromotionPatterns.length > 0) {
            for (const pattern of this.config.excludedPromotionPatterns) {
                if (promotionCode.match(new RegExp(pattern))) {
                    return this.createResult(
                        false, 
                        `Promotion matches exclusion pattern: ${pattern}`,
                        'pattern',
                        { promotionCode, bundleId, bundleName }
                    );
                }
            }
        }
        
        // 2. Check whitelist patterns (if specified, only these promotions allowed)
        if (this.config.allowedPromotionCodes && this.config.allowedPromotionCodes.length > 0) {
            const isWhitelisted = this.config.allowedPromotionCodes.some(
                code => promotionCode.toLowerCase().includes(code.toLowerCase())
            );
            if (!isWhitelisted) {
                return this.createResult(
                    false,
                    'Promotion not in whitelist',
                    'whitelist',
                    { promotionCode, bundleId, bundleName }
                );
            }
        }
        
        // 3. Get per-bundle policy
        const bundlePolicy: BundleExternalPromosPolicy = customFields?.allowExternalPromos || 'inherit';
        
        // 4. Apply bundle-level override (highest priority after patterns)
        if (bundlePolicy === 'no') {
            return this.createResult(
                false,
                'Bundle explicitly excludes external promotions',
                'bundle',
                { bundlePolicy, bundleId, bundleName, promotionCode }
            );
        } else if (bundlePolicy === 'yes') {
            // Bundle explicitly allows external promotions
            const discountCapResult = await this.checkDiscountCap(ctx, orderLine, promotion);
            if (!discountCapResult.allowed) {
                return discountCapResult;
            }
            
            return this.createResult(
                true,
                'Bundle explicitly allows external promotions',
                'bundle',
                { bundlePolicy, bundleId, bundleName, promotionCode }
            );
        }
        
        // 5. Apply per-promotion override
        if (promotionMetadata.bundlePolicy) {
            if (promotionMetadata.bundlePolicy === 'never') {
                return this.createResult(
                    false,
                    'Promotion explicitly excludes bundle components',
                    'promotion',
                    { promotionOverride: promotionMetadata.bundlePolicy, promotionCode }
                );
            } else if (promotionMetadata.bundlePolicy === 'always') {
                const discountCapResult = await this.checkDiscountCap(ctx, orderLine, promotion);
                if (!discountCapResult.allowed) {
                    return discountCapResult;
                }
                
                return this.createResult(
                    true,
                    'Promotion explicitly allows bundle components',
                    'promotion',
                    { promotionOverride: promotionMetadata.bundlePolicy, promotionCode }
                );
            }
            // 'inherit' falls through to global policy
        }
        
        // 6. Apply global policy
        const globalPolicy = this.config.siteWidePromosAffectBundles;
        if (globalPolicy === 'Exclude') {
            return this.createResult(
                false,
                'Global policy excludes promotions from bundle components',
                'global',
                { globalPolicy, bundleId, bundleName, promotionCode }
            );
        } else {
            // Global policy allows - check discount cap
            const discountCapResult = await this.checkDiscountCap(ctx, orderLine, promotion);
            if (!discountCapResult.allowed) {
                return discountCapResult;
            }
            
            return this.createResult(
                true,
                'Global policy allows promotions on bundle components',
                'global',
                { globalPolicy, bundleId, bundleName, promotionCode }
            );
        }
    }
    
    /**
     * Check discount cap to prevent over-discounting
     */
    private async checkDiscountCap(
        ctx: RequestContext,
        orderLine: OrderLine,
        promotion: Promotion
    ): Promise<BundlePromotionGuardResult> {
        if (!this.config.maxCumulativeDiscountPctForBundleChildren) {
            return this.createResult(true, 'No discount cap configured', 'discount_cap');
        }
        
        const customFields = (orderLine as any).customFields;
        const bundleAdjAmount = customFields?.bundleAdjAmount || 0;
        const baseUnitPrice = customFields?.baseUnitPrice || orderLine.unitPrice;
        
        // Calculate current bundle discount percentage
        const bundleDiscountPct = baseUnitPrice > 0 ? Math.abs(bundleAdjAmount) / baseUnitPrice : 0;
        
        // Estimate additional discount from this promotion (simplified)
        // In practice, this would need to calculate the actual promotion discount
        const estimatedAdditionalDiscount = this.estimatePromotionDiscount(promotion, orderLine);
        const additionalDiscountPct = baseUnitPrice > 0 ? estimatedAdditionalDiscount / baseUnitPrice : 0;
        
        const totalDiscountPct = bundleDiscountPct + additionalDiscountPct;
        const maxAllowed = this.config.maxCumulativeDiscountPctForBundleChildren;
        
        if (totalDiscountPct > maxAllowed) {
            return this.createResult(
                false,
                `Cumulative discount would exceed cap: ${(totalDiscountPct * 100).toFixed(1)}% > ${(maxAllowed * 100).toFixed(1)}%`,
                'discount_cap',
                { promotionCode: promotion.couponCode || promotion.name },
                totalDiscountPct
            );
        }
        
        return this.createResult(
            true,
            `Within discount cap: ${(totalDiscountPct * 100).toFixed(1)}% <= ${(maxAllowed * 100).toFixed(1)}%`,
            'discount_cap',
            {},
            totalDiscountPct
        );
    }
    
    /**
     * Estimate the discount this promotion would apply (simplified)
     */
    private estimatePromotionDiscount(promotion: Promotion, orderLine: OrderLine): number {
        // This is a simplified estimation - in practice, you'd need to
        // actually calculate what the promotion would do
        
        // For percentage discounts, try to extract percentage from promotion name/code
        const promotionText = `${promotion.name} ${promotion.couponCode || ''}`.toLowerCase();
        
        // Look for percentage patterns (10%, 20%, etc.)
        const percentMatch = promotionText.match(/(\d+)%/);
        if (percentMatch) {
            const percent = parseInt(percentMatch[1]) / 100;
            return orderLine.unitPrice * percent;
        }
        
        // Look for dollar amounts ($5, $10, etc.)
        const dollarMatch = promotionText.match(/\$(\d+)/);
        if (dollarMatch) {
            return parseInt(dollarMatch[1]) * 100; // Convert to cents
        }
        
        // Default conservative estimate (10% discount)
        return orderLine.unitPrice * 0.1;
    }
    
    /**
     * Extract bundle promotion metadata from promotion
     */
    private getPromotionBundleMetadata(promotion: Promotion): BundlePromotionMetadata {
        const customFields = (promotion as any).customFields || {};
        
        return {
            bundlePolicy: customFields.bundlePolicy,
            bundleAware: customFields.bundleAware,
            bundleRules: customFields.bundleRules
        };
    }
    
    /**
     * Create a guard result with optional logging
     */
    private createResult(
        allowed: boolean,
        reason: string,
        decidingPolicy: BundlePromotionGuardResult['decidingPolicy'],
        metadata?: any,
        currentDiscountPct?: number
    ): BundlePromotionGuardResult {
        const result: BundlePromotionGuardResult = {
            allowed,
            reason,
            decidingPolicy,
            currentDiscountPct,
            metadata: {
                globalPolicy: this.config.siteWidePromosAffectBundles,
                ...metadata
            }
        };
        
        if (this.config.logPromotionGuardDecisions) {
            const action = allowed ? 'ALLOW' : 'BLOCK';
            const metaStr = metadata ? JSON.stringify(metadata) : '';
            Logger.debug(
                `Bundle promotion guard: ${action} - ${reason} (${decidingPolicy}) ${metaStr}`,
                BundlePromotionGuardService.loggerCtx
            );
        }
        
        return result;
    }
    
    /**
     * Batch check multiple order lines for a promotion
     */
    async shouldPromotionApplyToOrder(
        ctx: RequestContext,
        orderLines: OrderLine[],
        promotion: Promotion
    ): Promise<{
        allowedLines: OrderLine[];
        blockedLines: OrderLine[];
        results: Array<{ line: OrderLine; result: BundlePromotionGuardResult }>;
    }> {
        const allowedLines: OrderLine[] = [];
        const blockedLines: OrderLine[] = [];
        const results: Array<{ line: OrderLine; result: BundlePromotionGuardResult }> = [];
        
        for (const line of orderLines) {
            const result = await this.shouldPromotionApplyToBundleLine(ctx, line, promotion);
            results.push({ line, result });
            
            if (result.allowed) {
                allowedLines.push(line);
            } else {
                blockedLines.push(line);
            }
        }
        
        return { allowedLines, blockedLines, results };
    }
    
    /**
     * Get summary statistics for promotion guard decisions
     */
    getGuardStatistics(
        results: Array<{ line: OrderLine; result: BundlePromotionGuardResult }>
    ): {
        totalLines: number;
        bundleLines: number;
        allowedLines: number;
        blockedLines: number;
        blockReasons: Record<string, number>;
        decidingPolicies: Record<string, number>;
    } {
        const stats = {
            totalLines: results.length,
            bundleLines: 0,
            allowedLines: 0,
            blockedLines: 0,
            blockReasons: {} as Record<string, number>,
            decidingPolicies: {} as Record<string, number>
        };
        
        for (const { line, result } of results) {
            const customFields = (line as any).customFields;
            const isBundleLine = !!(customFields?.bundleKey);
            
            if (isBundleLine) {
                stats.bundleLines++;
            }
            
            if (result.allowed) {
                stats.allowedLines++;
            } else {
                stats.blockedLines++;
                stats.blockReasons[result.reason] = (stats.blockReasons[result.reason] || 0) + 1;
            }
            
            stats.decidingPolicies[result.decidingPolicy] = 
                (stats.decidingPolicies[result.decidingPolicy] || 0) + 1;
        }
        
        return stats;
    }
}
