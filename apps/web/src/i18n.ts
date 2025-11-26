import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { isValidLocale, getStaticFallbackLocales } from './lib/config/dynamicI18n';

// Static fallback locales for build time and when Vendure is unavailable
export const locales = getStaticFallbackLocales();
export type Locale = string;

// Default locale (will be overridden by dynamic config at runtime)
export const defaultLocale: Locale = 'en';

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate that the incoming `locale` parameter is valid
  const locale = await requestLocale;
  
  if (!locale) {
    notFound();
  }

  // Try to validate against dynamic Vendure configuration
  let isValid = false;
  try {
    isValid = await isValidLocale(locale);
  } catch (error) {
    // Fallback to static validation if Vendure is unavailable
    console.warn('[i18n] Dynamic validation failed, using static fallback:', error);
    isValid = locales.includes(locale);
  }

  if (!isValid) {
    console.warn(`[i18n] Invalid locale '${locale}', redirecting to 404`);
    notFound();
  }

  // Try to load translation messages for the locale
  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    return {
      locale,
      messages,
    };
  } catch (error) {
    console.error(`[i18n] Failed to load messages for locale '${locale}':`, error);
    
    // Fallback to English if translation file is missing
    const fallbackMessages = (await import(`../messages/en.json`)).default;
    return {
      locale,
      messages: fallbackMessages,
    };
  }
});
