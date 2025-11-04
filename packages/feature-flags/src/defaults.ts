import { FeatureFlags } from './types';

// Default feature flags - safe fallback values
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  features: {
    payments: {
      gpgEnabled: true, // Default ON for core payment flow
    },
    shipping: {
      fileBridgeEnabled: false,
    },
    promotions: false,
    bundles: false,
    loyalty: false,
    search: {
      meiliEnabled: false,
    },
    analytics: {
      enabled: false,
    },
    pwa: {
      enabled: false,
    },
    cache: {
      edgeEnabled: false,
    },
  },
  branding: {
    siteName: 'Impact Nutrition',
    primaryColor: '#FF6B35',
    logoUrl: '',
    socialLinks: [],
  },
  search: {
    meiliHost: '',
    meiliIndexPrefix: 'prod_',
  },
  cache: {
    edgePurgeEnabled: false,
  },
};

// Development-specific overrides
export const DEVELOPMENT_OVERRIDES: Partial<FeatureFlags> = {
  features: {
    ...DEFAULT_FEATURE_FLAGS.features,
    // Enable more features in development for testing
    loyalty: true,
    search: {
      meiliEnabled: false, // Keep off until Meili is set up
    },
    pwa: {
      enabled: true,
    },
  },
};