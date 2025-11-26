'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAvailableLanguages, type AvailableLanguage } from '../hooks/useAvailableLanguages';
import { setApolloLanguage } from '../apollo-client';

interface VendureLanguageContextType {
  // Current language state
  currentLanguage: string;
  currentLanguageInfo: AvailableLanguage | undefined;
  
  // Available languages from Vendure
  availableLanguages: AvailableLanguage[];
  defaultLanguage: string;
  
  // State
  loading: boolean;
  error: any;
  
  // Actions
  switchLanguage: (languageCode: string) => void;
  
  // Helper functions
  isLanguageAvailable: (code: string) => boolean;
  getFallbackLanguage: (code: string) => string;
  hasMultipleLanguages: boolean;
}

const VendureLanguageContext = createContext<VendureLanguageContextType | undefined>(undefined);

export function VendureLanguageProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const currentLocale = useLocale();
  
  // Get available languages from Vendure
  const {
    availableLanguages,
    defaultLanguage,
    loading,
    error,
    getLanguageInfo,
    isLanguageAvailable,
    getFallbackLanguage,
    hasMultipleLanguages
  } = useAvailableLanguages();

  // Get current language info
  const currentLanguageInfo = getLanguageInfo(currentLocale);

  // Update Apollo client language whenever locale changes or available languages load
  useEffect(() => {
    console.log('[VendureLanguageContext] useEffect triggered:', {
      loading,
      availableLanguagesLength: availableLanguages.length,
      currentLocale,
      defaultLanguage
    });
    
    if (!loading && availableLanguages.length > 0) {
      const languageToSet = getFallbackLanguage(currentLocale);
      console.log('[VendureLanguageContext] Setting Apollo language to:', languageToSet);
      setApolloLanguage(languageToSet);
      
      // If current locale is not available in Vendure, redirect to fallback language
      if (!isLanguageAvailable(currentLocale) && currentLocale !== languageToSet) {
        console.warn(`Language '${currentLocale}' not available in Vendure. Redirecting to '${languageToSet}'.`);
        switchLanguage(languageToSet);
      }
    }
  }, [currentLocale, availableLanguages, loading, defaultLanguage, getFallbackLanguage, isLanguageAvailable]);

  // Function to switch language (updates Next.js route and Apollo)
  const switchLanguage = (languageCode: string) => {
    if (!isLanguageAvailable(languageCode)) {
      console.warn(`Language '${languageCode}' is not available. Available languages:`, availableLanguages.map(l => l.code));
      languageCode = getFallbackLanguage(languageCode);
    }

    // Update Apollo client language header immediately
    setApolloLanguage(languageCode);

    // Navigate to the new language route
    const currentPath = window.location.pathname;
    const segments = currentPath.split('/');
    
    // If current path starts with a locale, replace it
    if (segments[1] && availableLanguages.some(lang => lang.code === segments[1])) {
      segments[1] = languageCode;
    } else if (languageCode !== defaultLanguage) {
      // Add language prefix if not default
      segments.splice(1, 0, languageCode);
    }
    
    const newPath = segments.join('/') || '/';
    router.push(newPath);
  };

  const contextValue: VendureLanguageContextType = {
    // Current language state
    currentLanguage: currentLocale,
    currentLanguageInfo,
    
    // Available languages from Vendure
    availableLanguages,
    defaultLanguage,
    
    // State
    loading,
    error,
    
    // Actions
    switchLanguage,
    
    // Helper functions
    isLanguageAvailable,
    getFallbackLanguage,
    hasMultipleLanguages,
  };

  return (
    <VendureLanguageContext.Provider value={contextValue}>
      {children}
    </VendureLanguageContext.Provider>
  );
}

export function useVendureLanguage() {
  const context = useContext(VendureLanguageContext);
  if (!context) {
    throw new Error('useVendureLanguage must be used within VendureLanguageProvider');
  }
  return context;
}

// Export hook for components that just need to switch languages
export function useLanguageSwitcher() {
  const { switchLanguage, availableLanguages, currentLanguage, hasMultipleLanguages } = useVendureLanguage();
  return {
    switchLanguage,
    availableLanguages,
    currentLanguage,
    hasMultipleLanguages,
  };
}