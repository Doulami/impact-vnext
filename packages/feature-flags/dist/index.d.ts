import { FeatureFlags, FeatureFlagsConfig } from './types';
declare class FeatureFlagsManager {
    private config;
    private cache;
    private lastFetchTime;
    private cachedFlags;
    constructor(config: FeatureFlagsConfig);
    /**
     * Get store configuration from Strapi with caching
     */
    getStoreConfig(): Promise<FeatureFlags>;
    /**
     * Force refresh the cache
     */
    refreshCache(): Promise<FeatureFlags>;
    /**
     * Get fallback flags (defaults + development overrides)
     */
    private getFallbackFlags;
    /**
     * Merge fetched flags with defaults to ensure completeness
     */
    private mergeWithDefaults;
    /**
     * Deep merge two objects
     */
    private deepMerge;
}
/**
 * Initialize the feature flags manager
 */
export declare function initializeFeatureFlags(config: FeatureFlagsConfig): FeatureFlagsManager;
/**
 * Get store configuration (main export)
 */
export declare function getStoreConfig(): Promise<FeatureFlags>;
/**
 * Refresh the feature flags cache
 */
export declare function refreshFeatureFlags(): Promise<FeatureFlags>;
/**
 * Check if a specific feature is enabled
 */
export declare function isFeatureEnabled(feature: keyof FeatureFlags['features']): Promise<boolean>;
export * from './types';
export { DEFAULT_FEATURE_FLAGS, DEVELOPMENT_OVERRIDES } from './defaults';
//# sourceMappingURL=index.d.ts.map