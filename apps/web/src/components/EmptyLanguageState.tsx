'use client';

import { Globe, Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLanguageSwitcher } from '@/lib/contexts/VendureLanguageContext';

interface EmptyLanguageStateProps {
  currentLanguage: string;
  className?: string;
  showLanguageSwitcher?: boolean;
  title?: string;
  description?: string;
}

export function EmptyLanguageState({ 
  currentLanguage,
  className = "",
  showLanguageSwitcher = true,
  title,
  description
}: EmptyLanguageStateProps) {
  const t = useTranslations('common');
  const { availableLanguages, switchLanguage } = useLanguageSwitcher();
  
  // Get current language display info
  const currentLangInfo = availableLanguages.find(lang => lang.code === currentLanguage);
  
  // Get other available languages for switching
  const otherLanguages = availableLanguages.filter(lang => lang.code !== currentLanguage);

  const defaultTitle = title || t('noProductsInLanguage', { 
    language: currentLangInfo?.nativeName || currentLanguage.toUpperCase() 
  });
  
  const defaultDescription = description || t('switchLanguageAndTryAgain');

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
        <Globe className="w-8 h-8 text-gray-400" />
      </div>
      
      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {defaultTitle}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 mb-8 max-w-md">
        {defaultDescription}
      </p>
      
      {/* Language Switcher */}
      {showLanguageSwitcher && otherLanguages.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Languages className="w-4 h-4" />
            {t('availableLanguages')}:
          </p>
          
          <div className="flex gap-3 justify-center flex-wrap">
            {otherLanguages.map((language) => (
              <button
                key={language.code}
                onClick={() => switchLanguage(language.code)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <span className="text-lg">{language.flag}</span>
                <span className="font-medium">{language.nativeName}</span>
                {language.isDefault && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    Default
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Current Language Info */}
      <div className="mt-8 text-sm text-gray-500">
        {t('currentLanguage')}: <span className="font-medium">{currentLangInfo?.nativeName || currentLanguage}</span>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function CompactEmptyLanguageState({ 
  currentLanguage,
  className = ""
}: Pick<EmptyLanguageStateProps, 'currentLanguage' | 'className'>) {
  const t = useTranslations('common');
  const { availableLanguages } = useLanguageSwitcher();
  
  const currentLangInfo = availableLanguages.find(lang => lang.code === currentLanguage);

  return (
    <div className={`text-center py-8 px-4 ${className}`}>
      <Globe className="w-8 h-8 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-600 mb-1">
        {t('noProductsInLanguage', { 
          language: currentLangInfo?.nativeName || currentLanguage.toUpperCase() 
        })}
      </p>
      <p className="text-sm text-gray-500">
        {t('switchLanguageAndTryAgain')}
      </p>
    </div>
  );
}

// Simple version that auto-detects current language from locale
export function SimpleEmptyLanguageState({
  className = "",
  title,
  description
}: Omit<EmptyLanguageStateProps, 'currentLanguage'>) {
  const { currentLanguage } = useLanguageSwitcher();
  
  return (
    <EmptyLanguageState
      currentLanguage={currentLanguage}
      className={className}
      title={title}
      description={description}
    />
  );
}

// Default export - the simple auto-detecting version
export default SimpleEmptyLanguageState;
