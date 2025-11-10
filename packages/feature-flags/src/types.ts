// Feature Flags TypeScript interfaces

export interface FeatureFlags {
  features: {
    payments: {
      gpgEnabled: boolean;
    };
    shipping: {
      fileBridgeEnabled: boolean;
    };
    promotions: boolean;
    bundles: boolean;
    loyalty: boolean;
    search: {
      meiliEnabled: boolean;
    };
    analytics: {
      enabled: boolean;
    };
    pwa: {
      enabled: boolean;
    };
    cache: {
      edgeEnabled: boolean;
    };
  };
  branding: {
    siteName: string;
    primaryColor: string;
    logoUrl: string;
    socialLinks: Array<{
      platform: string;
      url: string;
    }>;
  };
  search?: {
    meiliHost: string;
    meiliIndexPrefix: string;
  };
  cache?: {
    edgePurgeEnabled: boolean;
  };
}

export interface StoreConfigResponse {
  data: {
    id: number;
    attributes: FeatureFlags;
  };
}

export interface CacheOptions {
  ttl: number; // TTL in seconds
  enabled: boolean;
}

export interface FeatureFlagsConfig {
  strapiUrl: string;
  strapiToken?: string;
  cache?: CacheOptions;
  fallbackFlags?: Partial<FeatureFlags>;
}