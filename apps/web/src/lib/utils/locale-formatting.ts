/**
 * Locale-aware formatting utilities for currency, numbers, and dates
 * Provides consistent formatting across the application based on user's locale
 */

import { useLocale } from 'next-intl';

// Locale to currency mapping
const LOCALE_CURRENCIES = {
  en: 'USD', // US Dollar for English
  ar: 'AED', // UAE Dirham for Arabic markets
  fr: 'EUR'  // Euro for French markets
} as const;

// Locale to region mapping for Intl APIs
const LOCALE_REGIONS = {
  en: 'en-US',
  ar: 'ar-AE', // UAE Arabic
  fr: 'fr-FR'
} as const;

/**
 * Format currency amount based on locale
 */
export function formatCurrency(
  amount: number,
  locale: string = 'en',
  currency?: string
): string {
  const actualCurrency = currency || LOCALE_CURRENCIES[locale as keyof typeof LOCALE_CURRENCIES] || 'USD';
  const region = LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US';
  
  // Convert cents to dollars/euros/dirhams
  const value = amount / 100;
  
  try {
    return new Intl.NumberFormat(region, {
      style: 'currency',
      currency: actualCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch (error) {
    // Fallback to USD formatting
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }
}

/**
 * Format numbers with proper thousand separators
 */
export function formatNumber(
  number: number,
  locale: string = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const region = LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US';
  
  try {
    return new Intl.NumberFormat(region, options).format(number);
  } catch (error) {
    return new Intl.NumberFormat('en-US', options).format(number);
  }
}

/**
 * Format dates based on locale
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const region = LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat(region, defaultOptions).format(dateObj);
  } catch (error) {
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
  }
}

/**
 * Format relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(
  date: Date | string,
  locale: string = 'en'
): string {
  const region = LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = (now.getTime() - dateObj.getTime()) / 1000;
  
  try {
    const rtf = new Intl.RelativeTimeFormat(region, { numeric: 'auto' });
    
    // Determine the appropriate unit
    const minute = 60;
    const hour = minute * 60;
    const day = hour * 24;
    const week = day * 7;
    const month = day * 30;
    const year = day * 365;
    
    if (Math.abs(diffInSeconds) < minute) {
      return rtf.format(-Math.round(diffInSeconds), 'second');
    } else if (Math.abs(diffInSeconds) < hour) {
      return rtf.format(-Math.round(diffInSeconds / minute), 'minute');
    } else if (Math.abs(diffInSeconds) < day) {
      return rtf.format(-Math.round(diffInSeconds / hour), 'hour');
    } else if (Math.abs(diffInSeconds) < week) {
      return rtf.format(-Math.round(diffInSeconds / day), 'day');
    } else if (Math.abs(diffInSeconds) < month) {
      return rtf.format(-Math.round(diffInSeconds / week), 'week');
    } else if (Math.abs(diffInSeconds) < year) {
      return rtf.format(-Math.round(diffInSeconds / month), 'month');
    } else {
      return rtf.format(-Math.round(diffInSeconds / year), 'year');
    }
  } catch (error) {
    // Fallback to simple English formatting
    const daysDiff = Math.floor(Math.abs(diffInSeconds) / (24 * 60 * 60));
    if (diffInSeconds > 0) {
      return daysDiff === 0 ? 'Today' : `${daysDiff} day${daysDiff === 1 ? '' : 's'} ago`;
    } else {
      return daysDiff === 0 ? 'Today' : `In ${daysDiff} day${daysDiff === 1 ? '' : 's'}`;
    }
  }
}

/**
 * React hooks for locale-aware formatting
 */
export function useLocaleFormatting() {
  const locale = useLocale();
  
  return {
    formatCurrency: (amount: number, currency?: string) => formatCurrency(amount, locale, currency),
    formatNumber: (number: number, options?: Intl.NumberFormatOptions) => formatNumber(number, locale, options),
    formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => formatDate(date, locale, options),
    formatRelativeTime: (date: Date | string) => formatRelativeTime(date, locale),
    locale,
    currency: LOCALE_CURRENCIES[locale as keyof typeof LOCALE_CURRENCIES] || 'USD',
    region: LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US'
  };
}

/**
 * Format percentage values
 */
export function formatPercentage(
  value: number,
  locale: string = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const region = LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US';
  
  try {
    return new Intl.NumberFormat(region, {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(value / 100);
  } catch (error) {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(value / 100);
  }
}

/**
 * Get currency symbol for locale
 */
export function getCurrencySymbol(locale: string = 'en'): string {
  const currency = LOCALE_CURRENCIES[locale as keyof typeof LOCALE_CURRENCIES] || 'USD';
  const region = LOCALE_REGIONS[locale as keyof typeof LOCALE_REGIONS] || 'en-US';
  
  try {
    const formatter = new Intl.NumberFormat(region, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    // Format 0 and extract just the symbol
    return formatter.formatToParts(0).find(part => part.type === 'currency')?.value || '$';
  } catch (error) {
    return '$';
  }
}