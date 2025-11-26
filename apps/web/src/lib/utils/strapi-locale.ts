/**
 * Strapi Locale Integration Utilities
 * 
 * This utility provides helper functions for making locale-aware requests to Strapi
 * and handling localized content across the Next.js application.
 */

import { useLocale } from 'next-intl';

/**
 * Map next-intl locales to Strapi locale codes
 * Strapi expects ISO language codes like 'en', 'ar', 'fr'
 */
export function mapLocaleToStrapi(nextIntlLocale: string): string {
  const localeMap: Record<string, string> = {
    'en': 'en',
    'ar': 'ar', 
    'fr': 'fr'
  };
  
  return localeMap[nextIntlLocale] || 'en'; // Default to English
}

/**
 * Add locale parameter to Strapi API URLs
 * Example: addLocaleParam('/api/articles', 'fr') -> '/api/articles?locale=fr'
 */
export function addLocaleParam(url: string, locale: string): string {
  const strapiLocale = mapLocaleToStrapi(locale);
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}locale=${strapiLocale}`;
}

/**
 * Hook to get current Strapi locale
 * Use this in components to get the Strapi-compatible locale code
 */
export function useStrapiLocale(): string {
  const nextIntlLocale = useLocale();
  return mapLocaleToStrapi(nextIntlLocale);
}

/**
 * Fetch localized content from Strapi with automatic locale parameter
 * Usage: 
 * const articles = await fetchStrapiLocalized('/api/articles', locale);
 */
export async function fetchStrapiLocalized(
  endpoint: string, 
  locale: string, 
  options?: RequestInit
): Promise<any> {
  const urlWithLocale = addLocaleParam(endpoint, locale);
  const response = await fetch(urlWithLocale, options);
  
  if (!response.ok) {
    throw new Error(`Strapi request failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Extract localized field from Strapi response
 * Strapi returns localized fields as nested objects
 * Usage: const title = extractLocalizedField(article, 'title', 'en');
 */
export function extractLocalizedField<T = string>(
  strapiItem: any, 
  fieldName: string, 
  locale: string,
  fallbackLocale: string = 'en'
): T | undefined {
  // Try current locale first
  const localizedValue = strapiItem?.[fieldName]?.[locale];
  if (localizedValue !== undefined) {
    return localizedValue;
  }
  
  // Fallback to default locale
  const fallbackValue = strapiItem?.[fieldName]?.[fallbackLocale];
  if (fallbackValue !== undefined) {
    return fallbackValue;  
  }
  
  // If no localization structure, return direct field value
  return strapiItem?.[fieldName];
}

/**
 * Client-side hook for fetching Strapi content with current locale
 * Usage in React components:
 * 
 * const { data, loading, error } = useStrapiContent('/api/articles');
 */
export function useStrapiContent(endpoint: string) {
  const locale = useStrapiLocale();
  
  // This would integrate with your existing data fetching pattern
  // You could use SWR, React Query, or your custom hook here
  // For now, returning the locale and URL to be used with your fetching solution
  
  return {
    url: addLocaleParam(endpoint, locale),
    locale,
    // Integrate with your preferred data fetching library
  };
}

/**
 * Server-side helper for Next.js API routes and server components
 * Gets locale from request headers or URL parameters
 */
export function getServerLocale(request: Request): string {
  // Extract from URL first (e.g., /fr/products)
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length > 0) {
    const possibleLocale = pathSegments[0];
    if (['en', 'ar', 'fr'].includes(possibleLocale)) {
      return possibleLocale;
    }
  }
  
  // Fallback to Accept-Language header
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const preferredLocale = acceptLanguage.split(',')[0]?.split('-')[0];
    if (['en', 'ar', 'fr'].includes(preferredLocale)) {
      return preferredLocale;
    }
  }
  
  return 'en'; // Default locale
}