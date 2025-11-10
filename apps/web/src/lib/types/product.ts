// Search-based Product Types for Vendure

export interface Asset {
  id: string;
  preview: string;
  source?: string;
}

// Search Result Types (primary for PLP)
export interface SearchResult {
  productId: string;
  productName: string;
  slug: string;
  description: string;
  productAsset?: {
    id: string;
    preview: string;
  };
  price: SinglePrice | PriceRange;
  priceWithTax: SinglePrice | PriceRange;
  inStock: boolean;
}

export interface SinglePrice {
  value: number;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface FacetValueResult {
  count: number;
  facetValue: {
    id: string;
    name: string;
    code: string;
    facet: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface SearchResponse {
  search: {
    items: SearchResult[];
    totalItems: number;
    facetValues: FacetValueResult[];
  };
}

export interface SearchInput {
  term?: string;
  groupByProduct?: boolean;
  take?: number;
  skip?: number;
  sort?: SearchSortParameter;
  collectionId?: string;
  collectionSlug?: string;
  facetValueFilters?: FacetValueFilterInput[];
  priceRange?: PriceRangeInput;
  priceRangeWithTax?: PriceRangeInput;
  inStock?: boolean;
}

export interface SearchSortParameter {
  name?: 'ASC' | 'DESC';
  price?: 'ASC' | 'DESC';
}

export interface FacetValueFilterInput {
  and?: string;
  or?: string[];
}

export interface PriceRangeInput {
  min: number;
  max: number;
}

// Legacy Product Types (for PDP and fallbacks)
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  priceWithTax: number;
  stockLevel: string;
  featuredAsset?: Asset;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset?: Asset;
  variants: ProductVariant[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// UI Types
export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  image?: string;
  priceWithTax: number;
  priceRange?: { min: number; max: number };
  inStock: boolean;
  rating?: number;
  reviews?: number;
}

export interface Filter {
  type: 'collection' | 'facet' | 'price' | 'inStock';
  id: string;
  label: string;
  active: boolean;
  count?: number;
}

// Helper functions
export function toProductCardData(searchResult: SearchResult): ProductCard {
  const getPrice = (price: SinglePrice | PriceRange): number => {
    if ('value' in price) {
      return price.value;
    } else {
      return price.min; // Show minimum price for ranges
    }
  };
  
  const getPriceRange = (price: SinglePrice | PriceRange): { min: number; max: number } | undefined => {
    if ('min' in price && 'max' in price && price.min !== price.max) {
      return { min: price.min, max: price.max };
    }
    return undefined;
  };
  
  return {
    id: searchResult.productId,
    name: searchResult.productName,
    slug: searchResult.slug,
    image: searchResult.productAsset?.preview,
    priceWithTax: getPrice(searchResult.priceWithTax),
    priceRange: getPriceRange(searchResult.priceWithTax),
    inStock: searchResult.inStock,
    rating: 4.5, // Mock rating
    reviews: 0,  // Mock reviews count
  };
}

export function productToCardData(product: Product): ProductCard {
  const variant = product.variants[0];
  
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    image: product.featuredAsset?.preview || variant?.featuredAsset?.preview,
    priceWithTax: variant?.priceWithTax || 0,
    inStock: variant?.stockLevel !== 'OUT_OF_STOCK',
    rating: 4.5,
    reviews: 0,
  };
}
