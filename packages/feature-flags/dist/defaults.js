"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEVELOPMENT_OVERRIDES = exports.DEFAULT_FEATURE_FLAGS = void 0;
// Default feature flags - safe fallback values
exports.DEFAULT_FEATURE_FLAGS = {
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
exports.DEVELOPMENT_OVERRIDES = {
    features: {
        ...exports.DEFAULT_FEATURE_FLAGS.features,
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
//# sourceMappingURL=defaults.js.map