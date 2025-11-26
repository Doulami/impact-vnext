// TypeScript types for Strapi Blog API

// Strapi Image/Media Format
export interface StrapiImageFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  width: number;
  height: number;
  size: number;
  path: string | null;
  url: string;
}

// Strapi Image/Media
export interface StrapiImage {
  id: number;
  name: string;
  alternativeText: string | null;
  caption: string | null;
  width: number;
  height: number;
  formats: {
    thumbnail?: StrapiImageFormat;
    small?: StrapiImageFormat;
    medium?: StrapiImageFormat;
    large?: StrapiImageFormat;
  } | null;
  hash: string;
  ext: string;
  mime: string;
  size: number;
  url: string;
  previewUrl: string | null;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

// Strapi Author
export interface StrapiAuthor {
  id: number;
  name: string;
  email: string | null;
  avatar: {
    data: {
      id: number;
      attributes: StrapiImage;
    } | null;
  };
  createdAt: string;
  updatedAt: string;
}

// Strapi Category
export interface StrapiCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

// Dynamic Zone Block Types
export interface RichTextBlock {
  __component: 'shared.rich-text';
  id: number;
  body: string;
}

export interface MediaBlock {
  __component: 'shared.media';
  id: number;
  file: {
    data: {
      id: number;
      attributes: StrapiImage;
    } | null;
  };
}

export interface QuoteBlock {
  __component: 'shared.quote';
  id: number;
  title: string;
  body: string;
}

export interface SliderBlock {
  __component: 'shared.slider';
  id: number;
  files: {
    data: Array<{
      id: number;
      attributes: StrapiImage;
    }>;
  };
}

export type DynamicZoneBlock = RichTextBlock | MediaBlock | QuoteBlock | SliderBlock;

// Strapi Article (full structure)
export interface StrapiArticle {
  id: number;
  title: string;
  description: string;
  longdescription: string;
  slug: string;
  cover: {
    data: {
      id: number;
      attributes: StrapiImage;
    } | null;
  };
  author: {
    data: {
      id: number;
      attributes: StrapiAuthor;
    } | null;
  };
  category: {
    data: {
      id: number;
      attributes: StrapiCategory;
    } | null;
  };
  blocks: DynamicZoneBlock[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

// Strapi API Response wrappers
export interface StrapiResponse<T> {
  data: {
    id: number;
    attributes: T;
  };
  meta: Record<string, unknown>;
}

export interface StrapiCollectionResponse<T> {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Simplified types for frontend use
export interface Article {
  id: number;
  title: string;
  description: string;
  longdescription: string;
  slug: string;
  coverImage: string | null;
  author: {
    name: string;
    email: string | null;
    avatar: string | null;
  } | null;
  category: {
    name: string;
    slug: string;
  } | null;
  blocks: DynamicZoneBlock[];
  // Any additional fields added in Strapi that we don't explicitly map
  extras: Record<string, unknown>;
  publishedAt: string;
  createdAt: string;
}

export interface ArticleListItem {
  id: number;
  title: string;
  description: string;
  slug: string;
  coverImage: string | null;
  author: {
    name: string;
    avatar: string | null;
  } | null;
  category: {
    name: string;
    slug: string;
  } | null;
  publishedAt: string;
}
