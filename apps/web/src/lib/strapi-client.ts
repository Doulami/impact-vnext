// Strapi API Client for Blog, Global Settings, Menu, and Pages

import {
  StrapiCollectionResponse,
  StrapiArticle,
  Article,
  ArticleListItem,
} from './types/blog';

import {
  GlobalSettings,
  GlobalSettingsRaw,
  Menu,
  MenuRaw,
  Page,
  PageRaw,
  StrapiResponse,
  StrapiCollectionResponse as StrapiCMSCollectionResponse,
} from './types/strapi';

const STRAPI_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:1337';

/**
 * Build full URL for Strapi media
 */
export function getStrapiMediaUrl(url: string | null): string | null {
  if (!url) return null;
  
  // If URL is already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Otherwise, prepend Strapi URL
  return `${STRAPI_URL}${url}`;
}

/**
 * Transform Strapi article to simplified Article type
 */
function transformArticle(strapiArticle: any): Article {
  // Handle both v4 (flat) and v5 (nested attributes) structures
  const data = strapiArticle.attributes || strapiArticle;
  const id = strapiArticle.id;
  
  // Debug: log all available fields
  console.log('All Strapi data keys:', Object.keys(data));

  // Compute extras: include any fields not explicitly mapped below
  const knownKeys = new Set([
    'title',
    'description',
    'longdescription',
    'descriptionlong', // Alternative name for long description
    'slug',
    'cover',
    'author',
    'category',
    'blocks',
    'publishedAt',
    'createdAt',
    'updatedAt',
  ]);
  const extras: Record<string, unknown> = {};
  Object.keys(data || {}).forEach((key) => {
    if (!knownKeys.has(key)) {
      const value = (data as any)[key];
      if (value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0)) {
        extras[key] = value;
      }
    }
  });
  
  // Debug: log all extras
  console.log('All extras keys:', Object.keys(extras));
  console.log('Full extras object:', JSON.stringify(extras, null, 2));
  
  return {
    id,
    title: data.title,
    description: data.description,
    longdescription: data.longdescription || data.descriptionlong || '',
    slug: data.slug,
    coverImage: data.cover?.url
      ? getStrapiMediaUrl(data.cover.url)
      : data.cover?.data?.attributes?.url
      ? getStrapiMediaUrl(data.cover.data.attributes.url)
      : null,
    author: data.author
      ? {
          name: data.author.name || data.author.data?.attributes?.name,
          email: data.author.email || data.author.data?.attributes?.email || null,
          avatar: data.author.avatar?.url
            ? getStrapiMediaUrl(data.author.avatar.url)
            : data.author.avatar?.data?.attributes?.url
            ? getStrapiMediaUrl(data.author.avatar.data.attributes.url)
            : data.author.data?.attributes?.avatar?.data?.attributes?.url
            ? getStrapiMediaUrl(data.author.data.attributes.avatar.data.attributes.url)
            : null,
        }
      : null,
    category: data.category && (data.category.name || data.category.data?.attributes?.name)
      ? {
          name: data.category.name || data.category.data?.attributes?.name,
          slug: data.category.slug || data.category.data?.attributes?.slug,
        }
      : null,
    blocks: data.blocks || [],
    extras,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt,
  };
}

/**
 * Transform Strapi article to simplified ArticleListItem type
 */
function transformArticleListItem(strapiArticle: any): ArticleListItem {
  // Handle both v4 (flat) and v5 (nested attributes) structures
  const data = strapiArticle.attributes || strapiArticle;
  const id = strapiArticle.id;
  
  return {
    id,
    title: data.title,
    description: data.description,
    slug: data.slug,
    coverImage: data.cover?.url
      ? getStrapiMediaUrl(data.cover.url)
      : data.cover?.data?.attributes?.url
      ? getStrapiMediaUrl(data.cover.data.attributes.url)
      : null,
    author: data.author
      ? {
          name: data.author.name || data.author.data?.attributes?.name,
          avatar: data.author.avatar?.url
            ? getStrapiMediaUrl(data.author.avatar.url)
            : data.author.avatar?.data?.attributes?.url
            ? getStrapiMediaUrl(data.author.avatar.data.attributes.url)
            : data.author.data?.attributes?.avatar?.data?.attributes?.url
            ? getStrapiMediaUrl(data.author.data.attributes.avatar.data.attributes.url)
            : null,
        }
      : null,
    category: data.category && (data.category.name || data.category.data?.attributes?.name)
      ? {
          name: data.category.name || data.category.data?.attributes?.name,
          slug: data.category.slug || data.category.data?.attributes?.slug,
        }
      : null,
    publishedAt: data.publishedAt,
  };
}

/**
 * Fetch all published articles
 */
export async function getArticles(): Promise<ArticleListItem[]> {
  try {
    const url = `${STRAPI_URL}/api/articles?populate=*&sort=publishedAt:desc`;
    
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
    });

    if (!response.ok) {
      console.error('Failed to fetch articles:', response.status, response.statusText);
      return [];
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return [];
    }
    
    // Filter out articles without categories and transform
    return result.data
      .map(transformArticleListItem)
      .filter((article: any) => article.category !== null);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return [];
  }
}

/**
 * Fetch a single article by slug
 */
export async function getArticle(slug: string, status?: 'draft' | 'published'): Promise<Article | null> {
  try {
    // Build URL with optional status parameter for draft mode
    let url = `${STRAPI_URL}/api/articles?filters[slug][$eq]=${slug}&populate=*`;
    
    // Add status parameter if provided (for draft mode)
    if (status) {
      url += `&status=${status}`;
    }
    
    console.log('Fetching article with slug:', slug, 'status:', status || 'default');
    console.log('URL:', url);
    
    const response = await fetch(url, {
      next: { revalidate: 60 }, // Revalidate every 60 seconds
      cache: status === 'draft' ? 'no-store' : 'default', // Don't cache draft content
    });

    if (!response.ok) {
      console.error('Failed to fetch article:', response.status, response.statusText);
      return null;
    }

    const result = await response.json();
    console.log('API Response data length:', result.data?.length || 0);
    
    if (!result.data || result.data.length === 0) {
      console.log('No article found for slug:', slug);
      return null;
    }

    const article = transformArticle(result.data[0]);
    console.log('Transformed article, has category:', !!article.category);
    return article;
  } catch (error) {
    console.error('Error fetching article:', error);
    return null;
  }
}

/**
 * Fetch articles by category slug
 */
export async function getArticlesByCategory(categorySlug: string): Promise<ArticleListItem[]> {
  try {
    const url = `${STRAPI_URL}/api/articles?filters[category][slug][$eq]=${categorySlug}&populate=*&sort=publishedAt:desc`;
    
    const response = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to fetch articles by category:', response.status, response.statusText);
      return [];
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return [];
    }
    
    return result.data.map(transformArticleListItem);
  } catch (error) {
    console.error('Error fetching articles by category:', error);
    return [];
  }
}

/**
 * Fetch all categories
 */
export async function getCategories() {
  try {
    const url = `${STRAPI_URL}/api/categories?sort=name:asc`;
    
    const response = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to fetch categories:', response.status, response.statusText);
      return [];
    }

    const result = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return [];
    }
    
    return result.data.map((cat: any) => {
      const data = cat.attributes || cat;
      return {
        id: cat.id,
        name: data.name,
        slug: data.slug,
      };
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

// ============================================================================
// Global Settings API
// ============================================================================

/**
 * Transform Strapi global settings to simplified type
 */
function transformGlobalSettings(raw: GlobalSettingsRaw): GlobalSettings {
  const attrs = raw.attributes;
  
  return {
    siteName: attrs.siteName,
    siteDescription: attrs.siteDescription,
    logoPrimary: attrs.logoPrimary?.data?.attributes?.url
      ? getStrapiMediaUrl(attrs.logoPrimary.data.attributes.url)
      : null,
    logoDark: attrs.logoDark?.data?.attributes?.url
      ? getStrapiMediaUrl(attrs.logoDark.data.attributes.url)
      : null,
    logoLight: attrs.logoLight?.data?.attributes?.url
      ? getStrapiMediaUrl(attrs.logoLight.data.attributes.url)
      : null,
    favicon: attrs.favicon?.data?.attributes?.url
      ? getStrapiMediaUrl(attrs.favicon.data.attributes.url)
      : null,
    topBarMessage: attrs.topBarMessage || null,
    showTopBar: attrs.showTopBar,
    footerText: attrs.footerText || null,
    footerLinks: attrs.footerLinks || [],
    socialLinks: attrs.socialLinks || [],
    defaultMetaTitle: attrs.defaultMetaTitle || null,
    defaultMetaDescription: attrs.defaultMetaDescription || null,
    defaultOpenGraphImage: attrs.defaultOpenGraphImage?.data?.attributes?.url
      ? getStrapiMediaUrl(attrs.defaultOpenGraphImage.data.attributes.url)
      : null,
    newsletterProvider: attrs.newsletterProvider,
    newsletterListId: attrs.newsletterListId || null,
    newsletterConsentText: attrs.newsletterConsentText || null,
  };
}

/**
 * Fetch global settings
 */
export async function getGlobalSettings(locale: string = 'en'): Promise<GlobalSettings | null> {
  try {
    const url = `${STRAPI_URL}/api/global?locale=${locale}&populate=*`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error('Failed to fetch global settings:', response.status, response.statusText);
      return null;
    }

    const result: StrapiResponse<GlobalSettingsRaw> = await response.json();
    
    if (!result.data) {
      return null;
    }
    
    return transformGlobalSettings(result.data);
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return null;
  }
}

// ============================================================================
// Menu API
// ============================================================================

/**
 * Transform Strapi menu to simplified type
 */
function transformMenu(raw: MenuRaw): Menu {
  const attrs = raw.attributes;
  
  return {
    id: raw.id,
    name: attrs.name,
    slug: attrs.slug,
    items: attrs.items || [],
  };
}

/**
 * Fetch menu by slug
 */
export async function getMenu(slug: string, locale: string = 'en'): Promise<Menu | null> {
  try {
    const url = `${STRAPI_URL}/api/menus?filters[slug][$eq]=${slug}&locale=${locale}&populate=*`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      console.error('Failed to fetch menu:', response.status, response.statusText);
      return null;
    }

    const result: StrapiCMSCollectionResponse<MenuRaw> = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return null;
    }
    
    return transformMenu(result.data[0]);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return null;
  }
}

/**
 * Fetch all menus
 */
export async function getMenus(locale: string = 'en'): Promise<Menu[]> {
  try {
    const url = `${STRAPI_URL}/api/menus?locale=${locale}&populate=*`;
    
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error('Failed to fetch menus:', response.status, response.statusText);
      return [];
    }

    const result: StrapiCMSCollectionResponse<MenuRaw> = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return [];
    }
    
    return result.data.map(transformMenu);
  } catch (error) {
    console.error('Error fetching menus:', error);
    return [];
  }
}

// ============================================================================
// Page API
// ============================================================================

/**
 * Transform Strapi page to simplified type
 */
function transformPage(raw: any): Page {
  // Handle both v4 (attributes wrapper) and v5 (flat) structures
  const data = raw.attributes || raw;
  const id = raw.id;
  
  return {
    id,
    title: data.title,
    slug: data.slug,
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
    seoImage: data.seoImage?.data?.attributes?.url
      ? getStrapiMediaUrl(data.seoImage.data.attributes.url)
      : data.seoImage?.url
      ? getStrapiMediaUrl(data.seoImage.url)
      : null,
    layoutBlocks: data.layoutBlocks || [],
  };
}

/**
 * Fetch page by slug
 */
export async function getPage(slug: string, locale: string = 'en'): Promise<Page | null> {
  try {
    const url = `${STRAPI_URL}/api/pages?filters[slug][$eq]=${slug}&locale=${locale}&populate=*`;
    
    const response = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to fetch page:', response.status, response.statusText);
      return null;
    }

    const result: StrapiCMSCollectionResponse<PageRaw> = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return null;
    }
    
    return transformPage(result.data[0]);
  } catch (error) {
    console.error('Error fetching page:', error);
    return null;
  }
}

/**
 * Fetch all pages
 */
export async function getPages(locale: string = 'en'): Promise<Page[]> {
  try {
    const url = `${STRAPI_URL}/api/pages?locale=${locale}&populate=*`;
    
    const response = await fetch(url, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error('Failed to fetch pages:', response.status, response.statusText);
      return [];
    }

    const result: StrapiCMSCollectionResponse<PageRaw> = await response.json();
    
    if (!result.data || result.data.length === 0) {
      return [];
    }
    
    return result.data.map(transformPage);
  } catch (error) {
    console.error('Error fetching pages:', error);
    return [];
  }
}
