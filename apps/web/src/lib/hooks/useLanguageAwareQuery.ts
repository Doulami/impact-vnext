'use client';

import { useQuery, type QueryHookOptions, type DocumentNode } from '@apollo/client/react';
import { useLocale } from 'next-intl';
import { useVendureLanguage } from '../contexts/VendureLanguageContext';

// Map Next.js locale to Vendure language code
const getLanguageCode = (locale: string): string => {
  switch (locale) {
    case 'ar': return 'ar';
    case 'fr': return 'fr';
    case 'de': return 'de';
    case 'es': return 'es';
    case 'it': return 'it';
    case 'pt': return 'pt';
    case 'ru': return 'ru';
    case 'ja': return 'ja';
    case 'zh': return 'zh';
    case 'ko': return 'ko';
    case 'hi': return 'hi';
    case 'en':
    default: return 'en';
  }
};

/**
 * Enhanced useQuery hook that automatically passes the current language code
 * to GraphQL queries that support multilingual content
 */
export function useLanguageAwareQuery<TData = any, TVariables extends Record<string, any> = any>(
  query: DocumentNode,
  options?: QueryHookOptions<TData, TVariables>
) {
  const locale = useLocale();
  const { isLanguageAvailable, getFallbackLanguage } = useVendureLanguage();
  
  // Get the appropriate language code
  const requestedLanguage = getLanguageCode(locale);
  const finalLanguageCode = getFallbackLanguage(requestedLanguage);
  
  // Log language selection for debugging
  if (requestedLanguage !== finalLanguageCode) {
    console.log(`[Language] Requested: ${requestedLanguage}, Using: ${finalLanguageCode} (fallback)`);
  }

  // Vendure gets language from Apollo headers (vendure-language-code)
  // No need to pass languageCode as a variable
  const queryOptions: QueryHookOptions<TData, TVariables> = {
    ...options,
  };

  const result = useQuery<TData, TVariables>(query, queryOptions);

  return {
    ...result,
    // Additional language context
    currentLanguage: finalLanguageCode,
    requestedLanguage,
    isUsingFallback: requestedLanguage !== finalLanguageCode,
  };
}

/**
 * Hook for fetching a single product with language support
 */
export function useProduct(slug: string, options?: QueryHookOptions) {
  const { GET_PRODUCT_BY_SLUG } = require('../graphql/queries');
  
  return useLanguageAwareQuery(GET_PRODUCT_BY_SLUG, {
    variables: { slug },
    skip: !slug,
    ...options,
  });
}

/**
 * Hook for fetching featured products with language support
 */
export function useFeaturedProducts(options?: QueryHookOptions) {
  const { GET_FEATURED_PRODUCTS } = require('../graphql/queries');
  
  return useLanguageAwareQuery(GET_FEATURED_PRODUCTS, {
    fetchPolicy: 'cache-and-network',
    ...options,
  });
}

/**
 * Hook for fetching related products with language support
 */
export function useRelatedProducts(collectionSlug: string, options?: QueryHookOptions) {
  const { GET_RELATED_PRODUCTS } = require('../graphql/queries');
  
  return useLanguageAwareQuery(GET_RELATED_PRODUCTS, {
    variables: { collectionSlug },
    skip: !collectionSlug,
    ...options,
  });
}

/**
 * Hook for fetching bundles with language support
 */
export function useBundles(bundleOptions?: any, options?: QueryHookOptions) {
  const { GET_BUNDLES } = require('../graphql/queries');
  
  return useLanguageAwareQuery(GET_BUNDLES, {
    variables: { options: bundleOptions },
    ...options,
  });
}

/**
 * Hook for fetching a single bundle with language support
 */
export function useBundle(id: string, options?: QueryHookOptions) {
  const { GET_BUNDLE } = require('../graphql/queries');
  
  return useLanguageAwareQuery(GET_BUNDLE, {
    variables: { id },
    skip: !id,
    ...options,
  });
}