import NodeCache from 'node-cache';
import { FeatureFlags, FeatureFlagsConfig, StoreConfigResponse } from './types';
import { DEFAULT_FEATURE_FLAGS, DEVELOPMENT_OVERRIDES } from './defaults';

class FeatureFlagsManager {
  private config: FeatureFlagsConfig;
  private cache: NodeCache | null = null;
  private lastFetchTime = 0;
  private cachedFlags: FeatureFlags | null = null;

  constructor(config: FeatureFlagsConfig) {
    this.config = {
      cache: {
        ttl: 600, // 10 minutes default TTL
        enabled: true,
      },
      ...config,
    };

    if (this.config.cache?.enabled) {
      this.cache = new NodeCache({
        stdTTL: this.config.cache.ttl,
        checkperiod: this.config.cache.ttl * 0.2,
      });
    }
  }

  /**
   * Get store configuration from Strapi with caching
   */
  async getStoreConfig(): Promise<FeatureFlags> {
    const cacheKey = 'store-config';

    // Check if feature flags are disabled
    if (process.env.FEATURE_FLAGS_ENABLED === 'false') {
      return this.getFallbackFlags();
    }

    // Try cache first
    if (this.cache) {
      const cached = this.cache.get<FeatureFlags>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check memory cache for recent fetch
    const now = Date.now();
    if (this.cachedFlags && (now - this.lastFetchTime) < (this.config.cache?.ttl || 600) * 1000) {
      return this.cachedFlags;
    }

    try {
      // Fetch from Strapi
      const response = await fetch(`${this.config.strapiUrl}/api/store-config`, {
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.strapiToken && {
            'Authorization': `Bearer ${this.config.strapiToken}`,
          }),
        },
      });

      if (!response.ok) {
        console.warn(`Failed to fetch store config: ${response.status} ${response.statusText}`);
        return this.getFallbackFlags();
      }

      const data = await response.json() as StoreConfigResponse;
      const flags = data.data.attributes;

      // Merge with defaults to ensure all fields are present
      const mergedFlags = this.mergeWithDefaults(flags);

      // Update caches
      this.cachedFlags = mergedFlags;
      this.lastFetchTime = now;
      
      if (this.cache) {
        this.cache.set(cacheKey, mergedFlags);
      }

      return mergedFlags;
    } catch (error) {
      console.warn('Error fetching store config from Strapi:', error);
      return this.getFallbackFlags();
    }
  }

  /**
   * Force refresh the cache
   */
  async refreshCache(): Promise<FeatureFlags> {
    if (this.cache) {
      this.cache.flushAll();
    }
    this.cachedFlags = null;
    this.lastFetchTime = 0;
    return this.getStoreConfig();
  }

  /**
   * Get fallback flags (defaults + development overrides)
   */
  private getFallbackFlags(): FeatureFlags {
    const baseFlags = { ...DEFAULT_FEATURE_FLAGS };
    
    // Apply development overrides in development
    if (process.env.NODE_ENV === 'development') {
      return this.deepMerge(baseFlags, DEVELOPMENT_OVERRIDES as FeatureFlags);
    }

    // Apply custom fallback flags if provided
    if (this.config.fallbackFlags) {
      return this.deepMerge(baseFlags, this.config.fallbackFlags as FeatureFlags);
    }

    return baseFlags;
  }

  /**
   * Merge fetched flags with defaults to ensure completeness
   */
  private mergeWithDefaults(flags: Partial<FeatureFlags>): FeatureFlags {
    return this.deepMerge(DEFAULT_FEATURE_FLAGS, flags as FeatureFlags);
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// Singleton instance
let featureFlagsManager: FeatureFlagsManager | null = null;

/**
 * Initialize the feature flags manager
 */
export function initializeFeatureFlags(config: FeatureFlagsConfig): FeatureFlagsManager {
  featureFlagsManager = new FeatureFlagsManager(config);
  return featureFlagsManager;
}

/**
 * Get store configuration (main export)
 */
export async function getStoreConfig(): Promise<FeatureFlags> {
  if (!featureFlagsManager) {
    // Auto-initialize with environment variables if not initialized
    const strapiUrl = process.env.STRAPI_URL || 'http://localhost:1337';
    const strapiToken = process.env.STRAPI_TOKEN;
    
    featureFlagsManager = new FeatureFlagsManager({
      strapiUrl,
      strapiToken,
    });
  }
  
  return featureFlagsManager.getStoreConfig();
}

/**
 * Refresh the feature flags cache
 */
export async function refreshFeatureFlags(): Promise<FeatureFlags> {
  if (!featureFlagsManager) {
    throw new Error('Feature flags not initialized. Call initializeFeatureFlags() first.');
  }
  
  return featureFlagsManager.refreshCache();
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(feature: keyof FeatureFlags['features']): Promise<boolean> {
  const config = await getStoreConfig();
  const featureValue = config.features[feature];
  
  // Handle nested feature objects (e.g., payments.gpgEnabled)
  if (typeof featureValue === 'object' && featureValue !== null) {
    return Object.values(featureValue).some(value => value === true);
  }
  
  return Boolean(featureValue);
}

// Re-export types
export * from './types';
export { DEFAULT_FEATURE_FLAGS, DEVELOPMENT_OVERRIDES } from './defaults';