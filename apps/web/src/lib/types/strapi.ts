// Strapi CMS Type Definitions for Phase 1

// ============================================================================
// Base Strapi Types
// ============================================================================

export interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiCollectionResponse<T> {
  data: T[];
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiMedia {
  id: number;
  name: string;
  alternativeText?: string;
  caption?: string;
  width?: number;
  height?: number;
  formats?: any;
  url: string;
}

// ============================================================================
// Shared Components
// ============================================================================

export interface FooterLink {
  id: number;
  label: string;
  url: string;
}

export interface SocialLink {
  id: number;
  platform: 'facebook' | 'instagram' | 'twitter' | 'youtube' | 'linkedin' | 'tiktok';
  url: string;
}

export interface MenuItem {
  id: number;
  label: string;
  type: 'internal_page' | 'product_category' | 'external_url' | 'custom';
  url?: string;
  page?: {
    data: {
      id: number;
      attributes: {
        slug: string;
        title: string;
      };
    };
  };
  vendureCollectionId?: string;
  newTab: boolean;
}

export interface HeroSectionBlock {
  id: number;
  __component: 'blocks.hero-section';
  headline: string;
  subheadline?: string;
  backgroundImage?: {
    data: {
      id: number;
      attributes: StrapiMedia;
    };
  };
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
}

export interface ContentSectionBlock {
  id: number;
  __component: 'blocks.content-section';
  title?: string;
  body: string;
  image?: {
    data: {
      id: number;
      attributes: StrapiMedia;
    };
  };
  imageAlignment: 'left' | 'right' | 'center';
}

export type LayoutBlock = HeroSectionBlock | ContentSectionBlock;

// ============================================================================
// Global Settings
// ============================================================================

export interface GlobalSettingsRaw {
  id: number;
  attributes: {
    siteName: string;
    siteDescription: string;
    logoPrimary?: {
      data: {
        id: number;
        attributes: StrapiMedia;
      };
    };
    logoDark?: {
      data: {
        id: number;
        attributes: StrapiMedia;
      };
    };
    logoLight?: {
      data: {
        id: number;
        attributes: StrapiMedia;
      };
    };
    favicon?: {
      data: {
        id: number;
        attributes: StrapiMedia;
      };
    };
    topBarMessage?: string;
    showTopBar: boolean;
    footerText?: string;
    footerLinks?: FooterLink[];
    socialLinks?: SocialLink[];
    defaultMetaTitle?: string;
    defaultMetaDescription?: string;
    defaultOpenGraphImage?: {
      data: {
        id: number;
        attributes: StrapiMedia;
      };
    };
    newsletterProvider: 'mailchimp' | 'klaviyo' | 'custom';
    newsletterListId?: string;
    newsletterConsentText?: string;
    locale?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
  };
}

export interface GlobalSettings {
  siteName: string;
  siteDescription: string;
  logoPrimary: string | null;
  logoDark: string | null;
  logoLight: string | null;
  favicon: string | null;
  topBarMessage: string | null;
  showTopBar: boolean;
  footerText: string | null;
  footerLinks: FooterLink[];
  socialLinks: SocialLink[];
  defaultMetaTitle: string | null;
  defaultMetaDescription: string | null;
  defaultOpenGraphImage: string | null;
  newsletterProvider: 'mailchimp' | 'klaviyo' | 'custom';
  newsletterListId: string | null;
  newsletterConsentText: string | null;
}

// ============================================================================
// Menu
// ============================================================================

export interface MenuRaw {
  id: number;
  attributes: {
    name: string;
    slug: string;
    items?: MenuItem[];
    locale?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface Menu {
  id: number;
  name: string;
  slug: string;
  items: MenuItem[];
}

// ============================================================================
// Page
// ============================================================================

export interface PageRaw {
  id: number;
  attributes: {
    title: string;
    slug: string;
    seoTitle?: string;
    seoDescription?: string;
    seoImage?: {
      data: {
        id: number;
        attributes: StrapiMedia;
      };
    };
    layoutBlocks?: LayoutBlock[];
    locale?: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
  };
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  seoTitle: string | null;
  seoDescription: string | null;
  seoImage: string | null;
  layoutBlocks: LayoutBlock[];
}
