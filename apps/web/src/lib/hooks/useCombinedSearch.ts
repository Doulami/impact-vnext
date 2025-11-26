'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import { useLocale } from 'next-intl';
import { SEARCH_PRODUCTS_AND_BUNDLES } from '../graphql/queries';
import { toProductCardData } from '../types/product';
import { filterSearchResultsByLanguage, filterProductsByLanguage } from '../utils/productLanguageValidation';
import type { 
  SearchResult,
  SearchInput,
  SearchSortParameter,
  FacetValueResult,
  PriceRangeInput,
  Bundle
} from '../types/product';

// Combined result type
interface CombinedResult {
  type: 'product' | 'bundle';
  data: any;
  id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  originalPrice?: number;
  savings?: number;
  inStock: boolean;
  rating: number;
  reviews: number;
}

// Convert bundle to unified result format
function toBundleResult(bundle: Bundle): CombinedResult {
  // Use effectivePrice (already in cents)
  const bundlePrice = bundle.effectivePrice;
  
  // Calculate component total (unitPrice is in dollars, convert to cents)
  const componentTotal = bundle.items.reduce((sum, item) => sum + (item.unitPrice * 100), 0);
  
  // Use totalSavings if available, otherwise calculate (all in cents)
  const savings = bundle.totalSavings ?? (componentTotal - bundlePrice);
  const shellProduct = bundle.shellProduct;

  return {
    type: 'bundle',
    data: bundle,
    id: bundle.id,
    name: shellProduct?.name || 'Bundle',
    slug: shellProduct?.slug || `bundle-${bundle.id}`,
    image: (shellProduct as any)?.featuredAsset?.preview || '/product-placeholder.svg',
    price: bundlePrice, // Already in cents
    originalPrice: componentTotal,
    savings: savings,
    inStock: bundle.status === 'ACTIVE',
    rating: 4.5,
    reviews: 127
  };
}

// Convert product search result to unified format
function toProductResult(searchResult: SearchResult): CombinedResult {
  const productCard = toProductCardData(searchResult);
  
  return {
    type: 'product',
    data: searchResult,
    id: productCard.id,
    name: productCard.name,
    slug: productCard.slug,
    image: productCard.image,
    price: productCard.priceWithTax,
    inStock: productCard.inStock,
    rating: productCard.rating || 4.5,
    reviews: productCard.reviews || 0
  };
}

// Hook for combined product and bundle search
export function useCombinedSearch(initialInput?: Partial<SearchInput>) {
  const locale = useLocale();
  const [searchInput, setSearchInput] = useState<SearchInput>({
    groupByProduct: true,
    take: 20,
    skip: 0,
    ...initialInput,
  });

  // Map next-intl locale to Vendure language code
  const getLanguageCode = (locale: string) => {
    switch (locale) {
      case 'ar': return 'ar';
      case 'fr': return 'fr';
      case 'en':
      default: return 'en';
    }
  };

  const { data, loading, error, fetchMore, refetch } = useQuery(SEARCH_PRODUCTS_AND_BUNDLES, {
    variables: { 
      input: searchInput,
      bundleOptions: {
        filter: { status: { eq: 'ACTIVE' } },
        take: 10,
        skip: 0
      }
    },
    fetchPolicy: 'cache-and-network',
  });

  // Get raw results and filter by language availability
  const rawProducts = (data as any)?.search?.items || [];
  const rawBundles = (data as any)?.bundles?.items || [];
  
  // Filter products by language (search results have productName field)
  const products = filterSearchResultsByLanguage(rawProducts, locale);
  
  // Filter bundles by language (bundles have shellProduct.name)
  const bundles = rawBundles.filter((bundle: Bundle) => {
    const shellProduct = bundle.shellProduct;
    return shellProduct?.name && typeof shellProduct.name === 'string' && shellProduct.name.trim().length > 0;
  });
  
  console.log(`[CombinedSearch] Language: ${locale}, Raw products: ${rawProducts.length} -> ${products.length}, Raw bundles: ${rawBundles.length} -> ${bundles.length}`);
  
  const combinedResults: CombinedResult[] = [
    ...(products as SearchResult[]).map(toProductResult),
    ...bundles
      .filter((bundle: Bundle) => {
        // Filter bundles based on search term if provided
        if (searchInput.term) {
          const term = searchInput.term.toLowerCase();
          const shellName = bundle.shellProduct?.name || '';
          const shellDescription = (bundle.shellProduct as any)?.description || '';
          return shellName.toLowerCase().includes(term) ||
                 shellDescription.toLowerCase().includes(term) ||
                 bundle.items.some(item => 
                   item.productVariant.product.name.toLowerCase().includes(term)
                 );
        }
        return true;
      })
      .map(toBundleResult)
  ];

  // Sort combined results by relevance/name
  combinedResults.sort((a, b) => {
    // Prioritize exact matches in search
    if (searchInput.term) {
      const term = searchInput.term.toLowerCase();
      const aExact = a.name.toLowerCase().includes(term);
      const bExact = b.name.toLowerCase().includes(term);
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;
    }
    
    // Then sort by name
    return a.name.localeCompare(b.name);
  });

  // Update search parameters
  const updateSearch = useCallback((updates: Partial<SearchInput>) => {
    setSearchInput(prev => ({
      ...prev,
      ...updates,
      skip: 0, // Reset pagination
    }));
  }, []);

  // Load more (for infinite scroll)
  const loadMore = useCallback(async () => {
    if (!(data as any)?.search?.items || loading) return;
    
    try {
      await fetchMore({
        variables: {
          input: {
            ...searchInput,
            skip: (data as any)?.search?.items?.length || 0,
          },
          bundleOptions: {
            filter: { enabled: { eq: true } },
            take: 10,
            skip: Math.floor(((data as any)?.search?.items?.length || 0) / 20) * 5 // Rough bundle pagination
          }
        },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult) return prev;
          return {
            search: {
              ...fetchMoreResult.search,
              items: [...(prev.search?.items || []), ...fetchMoreResult.search.items],
            },
            bundles: {
              ...fetchMoreResult.bundles,
              items: [...(prev.bundles?.items || []), ...fetchMoreResult.bundles.items],
            }
          };
        },
      });
    } catch (error) {
      console.error('Error loading more results:', error);
    }
  }, [data, searchInput, fetchMore, loading]);

  // Helper functions
  const setSort = useCallback((sort: SearchSortParameter) => {
    updateSearch({ sort });
  }, [updateSearch]);

  const setTerm = useCallback((term?: string) => {
    updateSearch({ term });
  }, [updateSearch]);

  const setCollection = useCallback((collectionId?: string, collectionSlug?: string) => {
    updateSearch({ collectionId, collectionSlug });
  }, [updateSearch]);

  const setPriceRange = useCallback((priceRange?: PriceRangeInput) => {
    updateSearch({ priceRangeWithTax: priceRange });
  }, [updateSearch]);

  const setInStock = useCallback((inStock?: boolean) => {
    updateSearch({ inStock });
  }, [updateSearch]);

  const setFacetFilters = useCallback((facetValueIds: string[]) => {
    const facetValueFilters = facetValueIds.length > 0 
      ? [{ or: facetValueIds }] 
      : undefined;
    updateSearch({ facetValueFilters });
  }, [updateSearch]);

  const clearFilters = useCallback(() => {
    setSearchInput({
      groupByProduct: true,
      take: 20,
      skip: 0,
    });
  }, []);

  const totalItems = ((data as any)?.search?.totalItems || 0) + ((data as any)?.bundles?.totalItems || 0);
  const hasMore = data 
    ? ((data as any)?.search?.items?.length < (data as any)?.search?.totalItems) || 
      (((data as any)?.bundles?.items?.length || 0) < ((data as any)?.bundles?.totalItems || 0))
    : false;

  return {
    // Combined results
    results: combinedResults,
    totalItems,
    
    // Separate for compatibility
    products: (data as any)?.search?.items || [],
    bundles: (data as any)?.bundles?.items || [],
    facetValues: (data as any)?.search?.facetValues || [],
    
    // State
    loading,
    error,
    hasMore,
    searchInput,
    
    // Actions
    loadMore,
    updateSearch,
    setSort,
    setCollection,
    setPriceRange,
    setInStock,
    setTerm,
    setFacetFilters,
    clearFilters,
    refetch,
    urlSearchInput: { ...searchInput, skip: 0 },
  };
}