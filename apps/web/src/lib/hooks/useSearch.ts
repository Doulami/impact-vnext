'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { SEARCH_PRODUCTS, GET_COLLECTIONS, GET_FACETS } from '../graphql/queries';
import type { 
  SearchResponse, 
  SearchResult, 
  SearchInput,
  SearchSortParameter,
  Collection,
  FacetValueResult,
  PriceRangeInput
} from '../types/product';

// Hook for product search with server-side filtering and sorting
export function useSearch(initialInput?: Partial<SearchInput>) {
  const [searchInput, setSearchInput] = useState<SearchInput>({
    groupByProduct: true,
    take: 20,
    skip: 0,
    ...initialInput,
  });

  const { data, loading, error, fetchMore, refetch } = useQuery<SearchResponse>(SEARCH_PRODUCTS, {
    variables: { input: searchInput },
    fetchPolicy: 'cache-and-network',
  });

  // Load more products (infinite scroll with smooth behavior)
  const loadMore = useCallback(async () => {
    if (!data?.search.items || loading) return;
    
    // Store current scroll position before loading
    const currentScrollY = window.scrollY;
    
    try {
      await fetchMore({
        variables: {
          input: {
            ...searchInput,
            skip: data.search.items.length,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          return {
            search: {
              ...fetchMoreResult.search,
              items: [...prev.search.items, ...fetchMoreResult.search.items],
            },
          };
        },
      });
      
      // Smooth scroll to maintain position relative to new content
      requestAnimationFrame(() => {
        window.scrollTo({
          top: currentScrollY,
          behavior: 'smooth'
        });
      });
    } catch (error) {
      console.error('Error loading more products:', error);
    }
  }, [data, searchInput, fetchMore, loading]);

  // Update search parameters (triggers new query)
  const updateSearch = useCallback((updates: Partial<SearchInput>) => {
    setSearchInput(prev => ({
      ...prev,
      ...updates,
      skip: 0, // Reset pagination
    }));
  }, []);

  // Create URL-safe search input (without skip for infinite scroll)
  const urlSearchInput = {
    ...searchInput,
    skip: 0, // Don't sync pagination to URL for infinite scroll
  };

  // Sort products
  const setSort = useCallback((sort: SearchSortParameter) => {
    updateSearch({ sort });
  }, [updateSearch]);

  // Filter by collection
  const setCollection = useCallback((collectionId?: string, collectionSlug?: string) => {
    updateSearch({ collectionId, collectionSlug });
  }, [updateSearch]);

  // Filter by price range
  const setPriceRange = useCallback((priceRange?: PriceRangeInput) => {
    updateSearch({ priceRangeWithTax: priceRange });
  }, [updateSearch]);

  // Filter by stock status
  const setInStock = useCallback((inStock?: boolean) => {
    updateSearch({ inStock });
  }, [updateSearch]);

  // Search by term
  const setTerm = useCallback((term?: string) => {
    updateSearch({ term });
  }, [updateSearch]);

  // Filter by facet values
  const setFacetFilters = useCallback((facetValueIds: string[]) => {
    const facetValueFilters = facetValueIds.length > 0 
      ? [{ or: facetValueIds }] 
      : undefined;
    updateSearch({ facetValueFilters });
  }, [updateSearch]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchInput({
      groupByProduct: true,
      take: 20,
      skip: 0,
      // Clear everything including search term for complete reset
    });
  }, []);

  const hasMore = data 
    ? data.search.items.length < data.search.totalItems
    : false;

  return {
    // Data
    products: data?.search.items || [],
    totalItems: data?.search.totalItems || 0,
    facetValues: data?.search.facetValues || [],
    
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
    urlSearchInput, // URL-safe version without pagination
  };
}

// Hook for collections (categories)
export function useCollections() {
  const { data, loading, error } = useQuery<{
    collections: {
      items: Collection[];
    };
  }>(GET_COLLECTIONS);

  return {
    collections: data?.collections.items || [],
    loading,
    error,
  };
}

// Helper hook to extract unique facets from search results
export function useFacets(facetValues: FacetValueResult[]) {
  const facetMap = new Map<string, {
    id: string;
    name: string;
    code: string;
    values: Array<{
      id: string;
      name: string;
      code: string;
      count: number;
    }>;
  }>();

  facetValues.forEach(({ facetValue, count }) => {
    const facetId = facetValue.facet.id;
    
    if (!facetMap.has(facetId)) {
      facetMap.set(facetId, {
        id: facetValue.facet.id,
        name: facetValue.facet.name,
        code: facetValue.facet.code,
        values: [],
      });
    }
    
    facetMap.get(facetId)!.values.push({
      id: facetValue.id,
      name: facetValue.name,
      code: facetValue.code,
      count,
    });
  });

  return Array.from(facetMap.values());
}

// Price range helper from search results
export function usePriceRanges(products: SearchResult[]): {
  min: number;
  max: number;
  ranges: Array<{ min: number; max: number; count: number; label: string }>;
} {
  const prices = products.map(product => {
    const price = product.priceWithTax;
    if ('value' in price) {
      return price.value;
    } else {
      return price.min; // Use minimum for ranges
    }
  });

  const min = Math.min(...prices) || 0;
  const max = Math.max(...prices) || 10000;

  // Create price buckets
  const ranges = [
    { min: 0, max: 2500, count: 0, label: 'Under $25' },
    { min: 2500, max: 5000, count: 0, label: '$25 - $50' },
    { min: 5000, max: 10000, count: 0, label: '$50 - $100' },
    { min: 10000, max: 1000000, count: 0, label: 'Over $100' },
  ];

  // Count products in each range
  prices.forEach(price => {
    ranges.forEach(range => {
      if (price >= range.min && price <= range.max) {
        range.count++;
      }
    });
  });

  return { min, max, ranges };
}