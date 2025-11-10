// Theme utilities for admin-editable branding via Strapi StoreConfig

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface StoreConfig {
  branding: {
    colors: BrandColors;
    logo?: string;
    favicon?: string;
  };
  features: {
    // Feature flags from milestone planning
    'payments.gpgEnabled': boolean;
    'loyalty': boolean;
    'search.meiliEnabled': boolean;
    // ... other flags
  };
}

// Default theme values (fallback when Strapi is unavailable)
export const defaultTheme: BrandColors = {
  primary: '#2c75ff',
  secondary: '#222222', 
  accent: '#00d4ff',
};

// Apply theme colors to CSS custom properties
export function applyTheme(colors: BrandColors) {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', colors.primary);
    root.style.setProperty('--brand-secondary', colors.secondary);
    root.style.setProperty('--brand-accent', colors.accent);
  }
}

// Fetch store config from Strapi (with fallback)
export async function getStoreConfig(): Promise<StoreConfig> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/store-config`, {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_STRAPI_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch store config');
    }
    
    const data = await response.json();
    return data.data.attributes;
  } catch (error) {
    console.warn('Using default theme - Strapi unavailable:', error);
    
    // Return default config with environment fallbacks
    return {
      branding: {
        colors: defaultTheme,
      },
      features: {
        'payments.gpgEnabled': process.env.NEXT_PUBLIC_PAYMENTS_GPG_ENABLED === 'true',
        'loyalty': process.env.NEXT_PUBLIC_LOYALTY_ENABLED === 'true',
        'search.meiliEnabled': process.env.NEXT_PUBLIC_SEARCH_MEILI_ENABLED === 'true',
      },
    };
  }
}

// Sports nutrition category color mapping
export const categoryColors = {
  'protein': 'color-category-protein',
  'pre-workout': 'color-category-pre-workout', 
  'post-workout': 'color-category-post-workout',
  'vitamins': 'color-category-vitamins',
  'accessories': 'color-category-accessories',
} as const;

// Utility to get category color class
export function getCategoryColorClass(category: keyof typeof categoryColors): string {
  return categoryColors[category] || 'color-primary';
}