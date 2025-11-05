'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { SearchInput } from '../types/product';

export function useUrlState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL parameters into SearchInput
  const getSearchInputFromUrl = useCallback((): Partial<SearchInput> => {
    const params = new URLSearchParams(searchParams.toString());
    const searchInput: Partial<SearchInput> = {
      groupByProduct: true,
    };

    // Search term
    const term = params.get('q');
    if (term) searchInput.term = term;

    // Collection
    const collectionId = params.get('collection');
    if (collectionId) searchInput.collectionId = collectionId;

    // Sort
    const sort = params.get('sort');
    if (sort) {
      if (sort === 'name-asc') searchInput.sort = { name: 'ASC' };
      if (sort === 'name-desc') searchInput.sort = { name: 'DESC' };
      if (sort === 'price-asc') searchInput.sort = { price: 'ASC' };
      if (sort === 'price-desc') searchInput.sort = { price: 'DESC' };
    }

    // Price range
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    if (minPrice && maxPrice) {
      searchInput.priceRangeWithTax = {
        min: parseInt(minPrice, 10),
        max: parseInt(maxPrice, 10),
      };
    }

    // In stock filter
    const inStock = params.get('inStock');
    if (inStock === 'true') searchInput.inStock = true;

    // Facet filters
    const facets = params.get('facets');
    if (facets) {
      const facetIds = facets.split(',');
      searchInput.facetValueFilters = [{ or: facetIds }];
    }

    // Pagination
    const page = params.get('page');
    if (page) {
      const pageNum = parseInt(page, 10);
      searchInput.skip = (pageNum - 1) * 20; // Assuming 20 items per page
    }

    return searchInput;
  }, [searchParams]);

  // Update URL with search input
  const updateUrl = useCallback((searchInput: SearchInput) => {
    const params = new URLSearchParams();

    // Search term
    if (searchInput.term) {
      params.set('q', searchInput.term);
    }

    // Collection
    if (searchInput.collectionId) {
      params.set('collection', searchInput.collectionId);
    }

    // Sort
    if (searchInput.sort) {
      if (searchInput.sort.name === 'ASC') params.set('sort', 'name-asc');
      if (searchInput.sort.name === 'DESC') params.set('sort', 'name-desc');
      if (searchInput.sort.price === 'ASC') params.set('sort', 'price-asc');
      if (searchInput.sort.price === 'DESC') params.set('sort', 'price-desc');
    }

    // Price range
    if (searchInput.priceRangeWithTax) {
      params.set('minPrice', searchInput.priceRangeWithTax.min.toString());
      params.set('maxPrice', searchInput.priceRangeWithTax.max.toString());
    }

    // In stock filter
    if (searchInput.inStock) {
      params.set('inStock', 'true');
    }

    // Facet filters
    if (searchInput.facetValueFilters && searchInput.facetValueFilters.length > 0) {
      const facetIds = searchInput.facetValueFilters[0].or;
      if (facetIds && facetIds.length > 0) {
        params.set('facets', facetIds.join(','));
      }
    }

    // Skip pagination in URL for infinite scroll
    // Pagination is handled client-side

    // Update URL without causing page reload
    const url = params.toString() ? `?${params.toString()}` : '';
    router.push(`/products${url}`, { scroll: false });
  }, [router]);

  // Get specific URL params for display
  const getActiveFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const filters = [];

    // Collection filter
    const collection = params.get('collection');
    if (collection) {
      filters.push({
        type: 'collection' as const,
        id: collection,
        label: 'Category',
      });
    }

    // Price range filter
    const minPrice = params.get('minPrice');
    const maxPrice = params.get('maxPrice');
    if (minPrice && maxPrice) {
      filters.push({
        type: 'price' as const,
        id: `${minPrice}-${maxPrice}`,
        label: `$${(parseInt(minPrice, 10) / 100).toFixed(0)} - $${(parseInt(maxPrice, 10) / 100).toFixed(0)}`,
      });
    }

    // In stock filter
    const inStock = params.get('inStock');
    if (inStock === 'true') {
      filters.push({
        type: 'inStock' as const,
        id: 'inStock',
        label: 'In Stock Only',
      });
    }

    // Facet filters
    const facets = params.get('facets');
    if (facets) {
      facets.split(',').forEach(facetId => {
        filters.push({
          type: 'facet' as const,
          id: facetId,
          label: 'Facet Filter', // Would need facet name lookup
        });
      });
    }

    return filters;
  }, [searchParams]);

  // Clear specific filter
  const clearFilter = useCallback((filterId: string, filterType: string) => {
    const params = new URLSearchParams(searchParams.toString());

    switch (filterType) {
      case 'collection':
        params.delete('collection');
        break;
      case 'price':
        params.delete('minPrice');
        params.delete('maxPrice');
        break;
      case 'inStock':
        params.delete('inStock');
        break;
      case 'facet':
        const currentFacets = params.get('facets');
        if (currentFacets) {
          const facetIds = currentFacets.split(',').filter(id => id !== filterId);
          if (facetIds.length > 0) {
            params.set('facets', facetIds.join(','));
          } else {
            params.delete('facets');
          }
        }
        break;
    }

    // Remove pagination when clearing filters
    params.delete('page');

    const url = params.toString() ? `?${params.toString()}` : '';
    router.push(`/products${url}`, { scroll: false });
  }, [searchParams, router]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Keep only search term
    const term = params.get('q');
    const newParams = new URLSearchParams();
    if (term) newParams.set('q', term);

    const url = newParams.toString() ? `?${newParams.toString()}` : '';
    router.push(`/products${url}`, { scroll: false });
  }, [searchParams, router]);

  return {
    getSearchInputFromUrl,
    updateUrl,
    getActiveFilters,
    clearFilter,
    clearAllFilters,
  };
}