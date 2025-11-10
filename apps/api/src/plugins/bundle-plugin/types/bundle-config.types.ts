/**
 * Bundle Plugin v2 Configuration Types
 * 
 * Phase 3.2 Implementation - Promotion Guard System
 * 
 * These types define the configuration options for the Bundle Plugin v2
 * promotion guard system, which controls how external promotions interact
 * with bundle pricing.
 */

/**
 * Global bundle promotion policy
 * - 'Exclude': Site-wide promotions do not apply to bundle components (default, safest)
 * - 'Allow': Site-wide promotions can apply to bundle components (risky - may cause double discounting)
 */
export type BundlePromotionPolicy = 'Exclude' | 'Allow';

/**
 * Per-promotion bundle policy override
 * - 'inherit': Use the global siteWidePromosAffectBundles setting (default)
 * - 'never': This promotion never applies to bundle components (strict exclusion)
 * - 'always': This promotion always applies to bundle components (override global exclusion)
 */
export type PromotionBundleOverride = 'inherit' | 'never' | 'always';

/**
 * Per-bundle external promotion setting
 * - 'inherit': Use global and per-promotion settings (default)
 * - 'no': This bundle never accepts external promotions (strict bundle isolation)
 * - 'yes': This bundle always accepts external promotions (override global exclusion)
 */
export type BundleExternalPromosPolicy = 'inherit' | 'no' | 'yes';

/**
 * Bundle Plugin configuration options
 */
export interface BundlePluginConfig {
    /**
     * Global policy for how site-wide promotions interact with bundles
     * Default: 'Exclude' (safest - prevents double discounting)
     */
    siteWidePromosAffectBundles: BundlePromotionPolicy;
    
    /**
     * Maximum cumulative discount percentage for bundle children
     * This prevents over-discounting when external promotions are allowed
     * Example: 0.50 = 50% max total discount from bundle + external promos
     * Default: null (no limit)
     */
    maxCumulativeDiscountPctForBundleChildren?: number;
    
    /**
     * Whether to log promotion guard decisions for debugging
     * Default: false
     */
    logPromotionGuardDecisions: boolean;
    
    /**
     * Promotion guard evaluation mode
     * - 'strict': Block all external promotions on bundle lines unless explicitly allowed
     * - 'permissive': Allow external promotions unless explicitly blocked
     * Default: 'strict'
     */
    guardMode: 'strict' | 'permissive';
    
    /**
     * Custom promotion exclusion patterns
     * Promotion codes that match these patterns will never apply to bundle components
     * regardless of other settings (e.g., for specific BOGO or high-value promos)
     */
    excludedPromotionPatterns?: string[];
    
    /**
     * Bundle-specific promotion whitelist
     * Only promotions with these codes can apply to bundle components
     * (when external promotions are allowed)
     */
    allowedPromotionCodes?: string[];
}

/**
 * Default bundle plugin configuration
 */
export const defaultBundlePluginConfig: BundlePluginConfig = {
    siteWidePromosAffectBundles: 'Exclude',
    maxCumulativeDiscountPctForBundleChildren: undefined,
    logPromotionGuardDecisions: false,
    guardMode: 'strict',
    excludedPromotionPatterns: [],
    allowedPromotionCodes: []
};

/**
 * Bundle promotion guard decision result
 */
export interface BundlePromotionGuardResult {
    /**
     * Whether the promotion should be allowed to apply to this bundle line
     */
    allowed: boolean;
    
    /**
     * The reason for the decision (for logging/debugging)
     */
    reason: string;
    
    /**
     * The policy that made the final decision
     */
    decidingPolicy: 'global' | 'promotion' | 'bundle' | 'pattern' | 'whitelist' | 'discount_cap';
    
    /**
     * Current cumulative discount percentage (if discount cap is active)
     */
    currentDiscountPct?: number;
    
    /**
     * Additional metadata for debugging
     */
    metadata?: {
        globalPolicy: BundlePromotionPolicy;
        promotionOverride?: PromotionBundleOverride;
        bundlePolicy?: BundleExternalPromosPolicy;
        bundleId?: string;
        bundleName?: string;
        promotionCode?: string;
    };
}

/**
 * Bundle promotion metadata (stored in promotion customFields)
 */
export interface BundlePromotionMetadata {
    /**
     * Override bundle policy for this specific promotion
     */
    bundlePolicy?: PromotionBundleOverride;
    
    /**
     * Whether this promotion is explicitly bundle-aware
     * Bundle-aware promotions can have different guard behavior
     */
    bundleAware?: boolean;
    
    /**
     * Custom bundle interaction rules for this promotion
     */
    bundleRules?: {
        /**
         * Only apply to specific bundle IDs
         */
        allowedBundles?: string[];
        
        /**
         * Never apply to these bundle IDs
         */
        excludedBundles?: string[];
        
        /**
         * Minimum bundle savings required for this promotion to apply
         */
        minBundleSavings?: number;
        
        /**
         * Maximum additional discount this promotion can add to bundles
         */
        maxAdditionalDiscount?: number;
    };
}