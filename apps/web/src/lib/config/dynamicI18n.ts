/**
 * Dynamic i18n Configuration
 * 
 * This module provides dynamic internationalization configuration that adapts to
 * the languages available in the Vendure channel. Instead of hardcoded languages,
 * this system fetches available languages from Vendure and configures Next.js i18n accordingly.
 */

import { LANGUAGE_METADATA } from '../graphql/queries';

// Fixed set of supported languages - only these will be shown to users
const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export interface DynamicLocaleConfig {
  locales: string[];
  defaultLocale: string;
  metadata: Record<string, {
    name: string;
    nativeName: string;
    flag: string;
    dir: 'ltr' | 'rtl';
  }>;
}

// Cache for the dynamic configuration
let _cachedConfig: DynamicLocaleConfig | null = null;
let _configPromise: Promise<DynamicLocaleConfig> | null = null;

/**
 * Fetch available languages from Vendure
 */
async function fetchAvailableLanguagesFromVendure(): Promise<DynamicLocaleConfig> {
  try {
    const vendureUrl = process.env.NEXT_PUBLIC_VENDURE_SHOP_API_URL || 'http://localhost:3000/shop-api';
    
    const query = `
      query GetAvailableLanguages {
        activeChannel {
          id
          code
          availableLanguageCodes
          defaultLanguageCode
        }
      }
    `;

    const response = await fetch(vendureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from Vendure: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    const { availableLanguageCodes, defaultLanguageCode } = result.data?.activeChannel || {};
    
    if (!availableLanguageCodes || !Array.isArray(availableLanguageCodes) || availableLanguageCodes.length === 0) {
      throw new Error('No available languages found in Vendure response');
    }

    console.log('[DynamicI18n] Raw Vendure languages:', availableLanguageCodes);
    console.log('[DynamicI18n] Supported languages:', SUPPORTED_LANGUAGES);

    // Filter to only supported languages
    const supportedVendureLanguages = availableLanguageCodes.filter((code: string) => 
      SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
    );

    // If no supported languages found, force English as minimum
    const finalLanguages = supportedVendureLanguages.length > 0 
      ? supportedVendureLanguages 
      : ['en'];

    console.log('[DynamicI18n] Filtered supported languages:', finalLanguages);

    // Build metadata for each supported language
    const metadata: Record<string, any> = {};
    finalLanguages.forEach((code: string) => {
      const langMetadata = LANGUAGE_METADATA[code];
      if (langMetadata) {
        metadata[code] = langMetadata;
      } else {
        // Fallback metadata for unknown languages (shouldn't happen with supported set)
        metadata[code] = {
          name: code.toUpperCase(),
          nativeName: code.toUpperCase(),
          flag: '🌐',
          dir: 'ltr'
        };
      }
    });

    const config: DynamicLocaleConfig = {
      locales: finalLanguages,
      defaultLocale: (defaultLanguageCode && supportedVendureLanguages.includes(defaultLanguageCode)) 
        ? defaultLanguageCode 
        : 'en',
      metadata
    };

    console.log('[DynamicI18n] Successfully fetched Vendure languages:', config);
    return config;

  } catch (error) {
    console.warn('[DynamicI18n] Failed to fetch languages from Vendure:', error);
    
    // Fallback to supported languages only
    const fallbackConfig: DynamicLocaleConfig = {
      locales: [...SUPPORTED_LANGUAGES], // Convert to regular array
      defaultLocale: 'en',
      metadata: {
        en: LANGUAGE_METADATA.en,
        ar: LANGUAGE_METADATA.ar,
        fr: LANGUAGE_METADATA.fr,
      }
    };

    console.log('[DynamicI18n] Using fallback configuration:', fallbackConfig);
    return fallbackConfig;
  }
}

/**
 * Get the dynamic i18n configuration
 * Uses caching to avoid repeated API calls
 */
export async function getDynamicI18nConfig(): Promise<DynamicLocaleConfig> {
  // Return cached config if available
  if (_cachedConfig) {
    return _cachedConfig;
  }

  // Return ongoing promise if fetch is in progress
  if (_configPromise) {
    return _configPromise;
  }

  // Start fetching configuration
  _configPromise = fetchAvailableLanguagesFromVendure().then(config => {
    _cachedConfig = config;
    _configPromise = null; // Clear the promise
    return config;
  }).catch(error => {
    _configPromise = null; // Clear the promise on error
    throw error;
  });

  return _configPromise;
}

/**
 * Check if a locale is valid according to the dynamic configuration
 */
export async function isValidLocale(locale: string): Promise<boolean> {
  const config = await getDynamicI18nConfig();
  return config.locales.includes(locale);
}

/**
 * Get the default locale from dynamic configuration
 */
export async function getDefaultLocale(): Promise<string> {
  const config = await getDynamicI18nConfig();
  return config.defaultLocale;
}

/**
 * Get all available locales from dynamic configuration
 */
export async function getAvailableLocales(): Promise<string[]> {
  const config = await getDynamicI18nConfig();
  return config.locales;
}

/**
 * Clear the cache (useful for development/testing)
 */
export function clearI18nCache(): void {
  _cachedConfig = null;
  _configPromise = null;
  console.log('[DynamicI18n] Cache cleared');
}

/**
 * Get fallback locales for static generation
 * This is used during build time when Vendure might not be available
 */
export function getStaticFallbackLocales(): string[] {
  return [...SUPPORTED_LANGUAGES]; // Always return supported languages only
}
