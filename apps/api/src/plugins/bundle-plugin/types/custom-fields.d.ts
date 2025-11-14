import '@vendure/core';

declare module '@vendure/core' {
    interface CustomGlobalSettingsFields {
        bundleSiteWidePromosAffectBundles?: string;
        bundleMaxCumulativeDiscountPct?: number;
    }
}
