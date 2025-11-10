/**
 * Plugin System Initialization
 * 
 * Registers and configures all plugins for the Impact Nutrition storefront
 */

import { pluginRegistry, eventManager } from '@impact/plugin-system';
import { BundlePlugin } from '@impact/bundle-plugin';

// Plugin registration flag to prevent duplicate registrations
let pluginsInitialized = false;

/**
 * Initialize and register all plugins
 */
export function initializePlugins(): void {
  if (pluginsInitialized) {
    console.log('[Plugin Init] Plugins already initialized, skipping...');
    return;
  }

  console.log('[Plugin Init] Initializing Impact Nutrition plugins...');

  try {
    // Register Bundle Plugin
    pluginRegistry.register(BundlePlugin);
    console.log('[Plugin Init] ✅ Bundle Plugin registered');

    // Set up feature flags for plugins
    pluginRegistry.setFeatureFlags({
      plugins: {
        bundles: {
          enabled: true,
          maxBundleSize: 10,
          discountType: 'percentage',
          allowCustomBundles: false
        },
        discounts: {
          enabled: true,
          sumoEnabled: false,
          maxDiscountPercentage: 50,
          allowStackableDiscounts: true,
          couponCodeEnabled: true
        },
        loyalty: {
          enabled: true,
          pointsPerDollar: 1,
          redemptionRate: 0.01,
          minRedemptionPoints: 100,
          maxRedemptionPercentage: 50
        },
        reviews: {
          enabled: true,
          requirePurchase: false,
          moderationEnabled: true
        },
        wishlist: {
          enabled: true,
          requireAuth: true,
          maxItems: 100
        }
      },
      features: {
        search: {
          enabled: true,
          instantSearch: true,
          filters: ['category', 'price', 'brand']
        },
        analytics: {
          enabled: true,
          googleAnalytics: true,
          facebookPixel: false
        },
        pwa: {
          enabled: true,
          offlineMode: false,
          pushNotifications: false
        }
      }
    });

    // Set up development event logging
    if (process.env.NODE_ENV === 'development') {
      eventManager.on('*', (payload) => {
        console.log(`[Plugin Event] ${payload.eventName}:`, payload.data);
      });
    }

    // Log plugin statistics
    const stats = pluginRegistry.getStats();
    console.log('[Plugin Init] Plugin system ready:', stats);

    pluginsInitialized = true;

  } catch (error) {
    console.error('[Plugin Init] Failed to initialize plugins:', error);
    throw error;
  }
}

/**
 * Get plugin system status
 */
export function getPluginSystemStatus(): {
  initialized: boolean;
  pluginCount: number;
  enabledCount: number;
  stats: any;
} {
  return {
    initialized: pluginsInitialized,
    pluginCount: pluginRegistry.getAll().length,
    enabledCount: pluginRegistry.getEnabled().length,
    stats: pluginRegistry.getStats()
  };
}

/**
 * Reset plugin system (for testing)
 */
export function resetPlugins(): void {
  const allPlugins = pluginRegistry.getAll();
  allPlugins.forEach(plugin => {
    pluginRegistry.unregister(plugin.name);
  });
  
  eventManager.removeAllListeners();
  eventManager.clearHistory();
  
  pluginsInitialized = false;
  console.log('[Plugin Init] Plugin system reset');
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize plugins after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePlugins);
  } else {
    // DOM is already ready, initialize immediately
    initializePlugins();
  }
}