'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_AVAILABLE_LANGUAGES, LANGUAGE_METADATA, type LanguageInfo } from '../graphql/queries';

// Fixed set of supported languages - only these will be shown to users
const SUPPORTED_LANGUAGES = ['en', 'ar', 'fr'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

interface AvailableLanguagesResponse {
  activeChannel: {
    id: string;
    code: string;
    availableLanguageCodes: string[];
    defaultLanguageCode: string;
  };
}

export interface AvailableLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  isDefault: boolean;
}

export function useAvailableLanguages() {
  const [availableLanguages, setAvailableLanguages] = useState<AvailableLanguage[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('en');
  
  const { data, loading, error } = useQuery<AvailableLanguagesResponse>(
    GET_AVAILABLE_LANGUAGES,
    {
      fetchPolicy: 'cache-first', // Cache this since languages don't change frequently
      errorPolicy: 'all', // Continue on errors to provide fallback
    }
  );

  useEffect(() => {
    if (data?.activeChannel) {
      const { availableLanguageCodes, defaultLanguageCode } = data.activeChannel;
      
      console.log('[useAvailableLanguages] Raw Vendure languages:', availableLanguageCodes);
      console.log('[useAvailableLanguages] Supported languages:', SUPPORTED_LANGUAGES);
      
      // Filter Vendure languages to only include supported languages
      const supportedVendureLanguages = availableLanguageCodes.filter((code: string) => 
        SUPPORTED_LANGUAGES.includes(code as SupportedLanguage)
      );
      
      console.log('[useAvailableLanguages] Filtered supported languages:', supportedVendureLanguages);
      
      // If no supported languages found in Vendure, force English as minimum
      const finalLanguages = supportedVendureLanguages.length > 0 
        ? supportedVendureLanguages 
        : ['en'];
      
      // Map filtered language codes to full language info
      const languages: AvailableLanguage[] = finalLanguages.map(code => {
        const metadata = LANGUAGE_METADATA[code];
        return {
          code,
          name: metadata?.name || code.toUpperCase(),
          nativeName: metadata?.nativeName || code.toUpperCase(),
          flag: metadata?.flag || '🌐',
          dir: metadata?.dir || 'ltr',
          isDefault: code === defaultLanguageCode || (code === 'en' && !supportedVendureLanguages.includes(defaultLanguageCode)),
        };
      });

      // Sort languages: default first, then alphabetically by name
      languages.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log('[useAvailableLanguages] Final languages for display:', languages);
      setAvailableLanguages(languages);
      setDefaultLanguage(defaultLanguageCode && supportedVendureLanguages.includes(defaultLanguageCode) ? defaultLanguageCode : 'en');
    } else if (!loading && !data) {
      // Fallback to supported languages only if Vendure API unavailable
      console.warn('Unable to fetch available languages from Vendure. Using fallback supported languages.');
      const fallbackLanguages: AvailableLanguage[] = SUPPORTED_LANGUAGES.map(code => ({
        ...LANGUAGE_METADATA[code],
        isDefault: code === 'en'
      }));
      setAvailableLanguages(fallbackLanguages);
      setDefaultLanguage('en');
    }
  }, [data, loading]);

  // Helper function to get language info by code
  const getLanguageInfo = (code: string): AvailableLanguage | undefined => {
    return availableLanguages.find(lang => lang.code === code);
  };

  // Helper function to check if a language is available
  const isLanguageAvailable = (code: string): boolean => {
    return availableLanguages.some(lang => lang.code === code);
  };

  // Helper function to get fallback language if requested language not available
  const getFallbackLanguage = (requestedCode: string): string => {
    if (isLanguageAvailable(requestedCode)) {
      return requestedCode;
    }
    return defaultLanguage;
  };

  return {
    // Data
    availableLanguages,
    defaultLanguage,
    
    // State
    loading,
    error,
    
    // Helper functions
    getLanguageInfo,
    isLanguageAvailable,
    getFallbackLanguage,
    
    // Derived data
    hasMultipleLanguages: availableLanguages.length > 1,
    languageCodes: availableLanguages.map(lang => lang.code),
  };
}