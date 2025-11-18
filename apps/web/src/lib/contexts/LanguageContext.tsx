'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type LanguageCode = 'en' | 'fr';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Header
    'header.help': 'Help & Support',
    'header.signIn': 'Sign In',
    'header.signUp': 'Sign Up',
    'header.account': 'Account',
    'header.accountSettings': 'Account Settings',
    'header.orderHistory': 'Order History',
    'header.signOut': 'Sign Out',
    'header.searchPlaceholder': 'Search products...',
    
    // PDP
    'pdp.productOverview': 'Product Overview',
    'pdp.nutritionalInformation': 'Nutritional Information',
    'pdp.composition': 'Composition / Nutrition Facts',
    'pdp.ingredients': 'Ingredients',
    'pdp.allergyAdvice': 'Allergy Advice',
    'pdp.selectComponent': 'Select Component:',
    'pdp.servingSize': 'Serving Size',
    'pdp.servingsPerContainer': 'servings per container',
    'pdp.nutrient': 'Nutrient',
    'pdp.perServing': 'Per Serving',
    'pdp.per100g': 'Per 100g',
    'pdp.ri': 'RI%',
    'pdp.nutritionComingSoon': 'Nutrition information coming soon',
    'pdp.addToCart': 'ADD TO CART',
    'pdp.outOfStock': 'OUT OF STOCK',
    'pdp.addToWishlist': 'Add to Wishlist',
    'pdp.share': 'Share',
    'pdp.freeShipping': 'Free Shipping',
    'pdp.freeShippingDesc': 'Orders over $50',
    'pdp.qualityGuarantee': 'Quality Guarantee',
    'pdp.qualityGuaranteeDesc': '100% authentic',
    'pdp.easyReturns': 'Easy Returns',
    'pdp.easyReturnsDesc': '30 day returns',
    'pdp.backToProducts': 'Back to Products',
    'pdp.variant': 'Variant:',
    'pdp.bundleSavings': 'Bundle Savings',
    'pdp.saveCompared': 'compared to buying separately',
    'pdp.whatsIncluded': 'What\'s Included in This Bundle',
    'pdp.individualTotal': 'Individual Total:',
    'pdp.bundlePrice': 'Bundle Price:',
    'pdp.youSave': 'You Save:',
    'pdp.qty': 'Qty',
  },
  fr: {
    // Header
    'header.help': 'Aide & Support',
    'header.signIn': 'Se connecter',
    'header.signUp': 'S\'inscrire',
    'header.account': 'Compte',
    'header.accountSettings': 'Paramètres du compte',
    'header.orderHistory': 'Historique des commandes',
    'header.signOut': 'Se déconnecter',
    'header.searchPlaceholder': 'Rechercher des produits...',
    
    // PDP
    'pdp.productOverview': 'Aperçu du produit',
    'pdp.nutritionalInformation': 'Informations nutritionnelles',
    'pdp.composition': 'Composition / Valeurs nutritionnelles',
    'pdp.ingredients': 'Ingrédients',
    'pdp.allergyAdvice': 'Conseils d\'allergie',
    'pdp.selectComponent': 'Sélectionner un composant:',
    'pdp.servingSize': 'Portion',
    'pdp.servingsPerContainer': 'portions par contenant',
    'pdp.nutrient': 'Nutriment',
    'pdp.perServing': 'Par portion',
    'pdp.per100g': 'Pour 100g',
    'pdp.ri': 'AR%',
    'pdp.nutritionComingSoon': 'Informations nutritionnelles à venir',
    'pdp.addToCart': 'AJOUTER AU PANIER',
    'pdp.outOfStock': 'RUPTURE DE STOCK',
    'pdp.addToWishlist': 'Ajouter aux favoris',
    'pdp.share': 'Partager',
    'pdp.freeShipping': 'Livraison gratuite',
    'pdp.freeShippingDesc': 'Commandes de plus de $50',
    'pdp.qualityGuarantee': 'Garantie de qualité',
    'pdp.qualityGuaranteeDesc': '100% authentique',
    'pdp.easyReturns': 'Retours faciles',
    'pdp.easyReturnsDesc': 'Retours sous 30 jours',
    'pdp.backToProducts': 'Retour aux produits',
    'pdp.variant': 'Variante:',
    'pdp.bundleSavings': 'Économies du pack',
    'pdp.saveCompared': 'par rapport à l\'achat séparé',
    'pdp.whatsIncluded': 'Ce qui est inclus dans ce pack',
    'pdp.individualTotal': 'Total individuel:',
    'pdp.bundlePrice': 'Prix du pack:',
    'pdp.youSave': 'Vous économisez:',
    'pdp.qty': 'Qté',
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('en');

  // Load language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('language') as LanguageCode;
    if (saved && (saved === 'en' || saved === 'fr')) {
      setLanguageState(saved);
    }
  }, []);

  // Save to localStorage and update state
  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
