"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVELOPMENT_OVERRIDES = exports.DEFAULT_FEATURE_FLAGS = void 0;
exports.initializeFeatureFlags = initializeFeatureFlags;
exports.getStoreConfig = getStoreConfig;
exports.refreshFeatureFlags = refreshFeatureFlags;
exports.isFeatureEnabled = isFeatureEnabled;
const node_cache_1 = __importDefault(require("node-cache"));
const defaults_1 = require("./defaults");
class FeatureFlagsManager {
    constructor(config) {
        this.cache = null;
        this.lastFetchTime = 0;
        this.cachedFlags = null;
        this.config = {
            cache: {
                ttl: 600, // 10 minutes default TTL
                enabled: true,
            },
            ...config,
        };
        if (this.config.cache?.enabled) {
            this.cache = new node_cache_1.default({
                stdTTL: this.config.cache.ttl,
                checkperiod: this.config.cache.ttl * 0.2,
            });
        }
    }
    /**
     * Get store configuration from Strapi with caching
     */
    async getStoreConfig() {
        const cacheKey = 'store-config';
        // Check if feature flags are disabled
        if (process.env.FEATURE_FLAGS_ENABLED === 'false') {
            return this.getFallbackFlags();
        }
        // Try cache first
        if (this.cache) {
            const cached = this.cache.get(cacheKey);
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
            const data = await response.json();
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
        }
        catch (error) {
            console.warn('Error fetching store config from Strapi:', error);
            return this.getFallbackFlags();
        }
    }
    /**
     * Force refresh the cache
     */
    async refreshCache() {
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
    getFallbackFlags() {
        const baseFlags = { ...defaults_1.DEFAULT_FEATURE_FLAGS };
        // Apply development overrides in development
        if (process.env.NODE_ENV === 'development') {
            return this.deepMerge(baseFlags, defaults_1.DEVELOPMENT_OVERRIDES);
        }
        // Apply custom fallback flags if provided
        if (this.config.fallbackFlags) {
            return this.deepMerge(baseFlags, this.config.fallbackFlags);
        }
        return baseFlags;
    }
    /**
     * Merge fetched flags with defaults to ensure completeness
     */
    mergeWithDefaults(flags) {
        return this.deepMerge(defaults_1.DEFAULT_FEATURE_FLAGS, flags);
    }
    /**
     * Deep merge two objects
     */
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key] || {}, source[key]);
            }
            else {
                result[key] = source[key];
            }
        }
        return result;
    }
}
// Singleton instance
let featureFlagsManager = null;
/**
 * Initialize the feature flags manager
 */
function initializeFeatureFlags(config) {
    featureFlagsManager = new FeatureFlagsManager(config);
    return featureFlagsManager;
}
/**
 * Get store configuration (main export)
 */
async function getStoreConfig() {
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
async function refreshFeatureFlags() {
    if (!featureFlagsManager) {
        throw new Error('Feature flags not initialized. Call initializeFeatureFlags() first.');
    }
    return featureFlagsManager.refreshCache();
}
/**
 * Check if a specific feature is enabled
 */
async function isFeatureEnabled(feature) {
    const config = await getStoreConfig();
    const featureValue = config.features[feature];
    // Handle nested feature objects (e.g., payments.gpgEnabled)
    if (typeof featureValue === 'object' && featureValue !== null) {
        return Object.values(featureValue).some(value => value === true);
    }
    return Boolean(featureValue);
}
// Re-export types
__exportStar(require("./types"), exports);
var defaults_2 = require("./defaults");
Object.defineProperty(exports, "DEFAULT_FEATURE_FLAGS", { enumerable: true, get: function () { return defaults_2.DEFAULT_FEATURE_FLAGS; } });
Object.defineProperty(exports, "DEVELOPMENT_OVERRIDES", { enumerable: true, get: function () { return defaults_2.DEVELOPMENT_OVERRIDES; } });
//# sourceMappingURL=index.js.map