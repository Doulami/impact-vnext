'use client';

import { useEffect, Suspense, useState, useRef } from 'react';
import { useSearch, useCollections, useFacets, usePriceRanges } from '@/lib/hooks/useSearch';
import { useUrlState } from '@/lib/hooks/useUrlState';
import { toProductCardData } from '@/lib/types/product';
import { SlidersHorizontal, Star, X, User } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';
import MiniCart from '@/components/MiniCart';
import SearchBar from '@/components/SearchBar';
import Header from '@/components/Header';
import { useSearchParams } from 'next/navigation';

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const currentSearchTerm = searchParams.get('search') || searchParams.get('q') || '';
  const { getSearchInputFromUrl, updateUrl, getActiveFilters, clearFilter, clearAllFilters } = useUrlState();
  
  // Initialize search with URL params
  const initialInput = getSearchInputFromUrl();
  const {
    products,
    totalItems,
    facetValues,
    loading,
    error,
    hasMore,
    searchInput,
    loadMore,
    setSort,
    setCollection,
    setPriceRange,
    setInStock,
    setTerm,
    setFacetFilters,
    clearFilters,
    urlSearchInput,
  } = useSearch(initialInput);
  
  const { collections, loading: collectionsLoading } = useCollections();
  const facets = useFacets(facetValues);
  const priceRanges = usePriceRanges(products);
  const productCards = products.map(toProductCardData);
  const activeFilters = getActiveFilters();
  const { addItem, openCart } = useCart();

  const handleClearFilter = (filter: { id: string; type: string }) => {
    switch (filter.type) {
      case 'search':
        // Clear search term - update both URL and search state
        setTerm(undefined);
        clearFilter('search', 'search');
        break;
      case 'collection':
        setCollection(undefined);
        break;
      case 'price':
        setPriceRange(undefined);
        break;
      case 'inStock':
        setInStock(undefined);
        break;
      case 'facet':
        {
          const currentIds = searchInput.facetValueFilters?.[0]?.or || [];
          const newIds = currentIds.filter(id => id !== filter.id);
          setFacetFilters(newIds);
        }
        break;
    }
  };
  
  // Track items count to only animate new ones
  const prevItemCount = useRef(0);
  const [newItemsStartIndex, setNewItemsStartIndex] = useState(0);
  
  useEffect(() => {
    if (productCards.length > prevItemCount.current) {
      setNewItemsStartIndex(prevItemCount.current);
      prevItemCount.current = productCards.length;
    }
  }, [productCards.length]);
  
  // Sync URL when search input changes (excluding pagination for infinite scroll)
  useEffect(() => {
    updateUrl(urlSearchInput);
  }, [urlSearchInput, updateUrl]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        showSearchDropdown={false} 
        className="sticky top-0 z-50"
      />

      {/* Page Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-shrink-0">
              <h1 className="text-4xl font-bold mb-2">All Products</h1>
              <p className="text-gray-600">
                {totalItems} products available
              </p>
            </div>
            
            {/* Active Filters - Fixed container to prevent layout shift */}
            <div className="flex-1 max-w-lg ml-8">
              <div className="min-h-[60px] flex items-center justify-end">
                {activeFilters.length > 0 ? (
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <span className="text-sm font-medium whitespace-nowrap">Active filters:</span>
                    {activeFilters.map((filter) => (
                      <button
                        key={`${filter.type}-${filter.id}`}
                        onClick={() => handleClearFilter(filter)}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 hover:bg-blue-200 transition-colors"
                      >
                        {filter.label}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                    <button
                      onClick={() => clearFilters()}
                      className="text-sm text-red-600 hover:underline ml-2 whitespace-nowrap transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                ) : (
                  <div></div> // Empty placeholder to maintain height
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-lg">Filters</h2>
                <SlidersHorizontal className="w-5 h-5" />
              </div>

              {/* Category Filter - using facets with counts */}
              {facets.filter(facet => 
                facet.code === 'category' || 
                facet.name.toLowerCase().includes('category') ||
                facet.name.toLowerCase().includes('type')
              ).map((categoryFacet) => (
                <div key={categoryFacet.id} className="mb-6">
                  <h3 className="font-semibold mb-3">{categoryFacet.name}</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categoryFacet.values.map((value) => (
                      <label key={value.id} className="flex items-center cursor-pointer justify-between">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            className="mr-2"
                            checked={
                              searchInput.facetValueFilters?.[0]?.or?.includes(value.id) || false
                            }
                            onChange={(e) => {
                              const currentIds = searchInput.facetValueFilters?.[0]?.or || [];
                              const newIds = e.target.checked
                                ? [...currentIds, value.id]
                                : currentIds.filter(id => id !== value.id);
                              setFacetFilters(newIds);
                            }}
                          />
                          <span className="text-sm">{value.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">({value.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Stock Status */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Availability</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="mr-2"
                      checked={!!searchInput.inStock}
                      onChange={(e) => setInStock(e.target.checked || undefined)}
                    />
                    <span className="text-sm">In Stock Only</span>
                  </label>
                </div>
              </div>
              
              {/* Other Facet Filters (excluding category-related ones) */}
              {facets.filter(facet => 
                facet.code !== 'category' && 
                !facet.name.toLowerCase().includes('category') &&
                !facet.name.toLowerCase().includes('type')
              ).map((facet) => (
                <div key={facet.id} className="mb-6">
                  <h3 className="font-semibold mb-3">{facet.name}</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {facet.values.map((value) => (
                      <label key={value.id} className="flex items-center cursor-pointer justify-between">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            className="mr-2"
                            checked={
                              searchInput.facetValueFilters?.[0]?.or?.includes(value.id) || false
                            }
                            onChange={(e) => {
                              const currentIds = searchInput.facetValueFilters?.[0]?.or || [];
                              const newIds = e.target.checked
                                ? [...currentIds, value.id]
                                : currentIds.filter(id => id !== value.id);
                              setFacetFilters(newIds);
                            }}
                          />
                          <span className="text-sm">{value.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">({value.count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Product Grid */}
          <main className="lg:col-span-3">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg mb-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {productCards.length} of {totalItems} products
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">Sort by:</span>
                <select
                  value={
                    searchInput.sort?.name === 'ASC' ? 'name-asc' :
                    searchInput.sort?.name === 'DESC' ? 'name-desc' :
                    searchInput.sort?.price === 'ASC' ? 'price-asc' :
                    searchInput.sort?.price === 'DESC' ? 'price-desc' :
                    'name-asc'
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'name-asc') setSort({ name: 'ASC' });
                    else if (value === 'name-desc') setSort({ name: 'DESC' });
                    else if (value === 'price-asc') setSort({ price: 'ASC' });
                    else if (value === 'price-desc') setSort({ price: 'DESC' });
                  }}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Loading State */}
            {loading && productCards.length === 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="aspect-square bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600 font-medium mb-2">Unable to load products</p>
                <p className="text-sm text-red-500">
                  {error.message}
                </p>
              </div>
            )}

            {/* Products Grid */}
            {!loading && productCards.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {productCards.map((product, index) => {
                    // Only animate items that are newly loaded
                    const isNewItem = index >= newItemsStartIndex;
                    const animationIndex = isNewItem ? index - newItemsStartIndex : 0;
                    return (
                      <Link
                        key={product.id}
                        href={`/products/${product.slug}`}
                        className={`bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group ${
                          isNewItem ? 'animate-fade-in' : ''
                        }`}
                        style={isNewItem ? {
                          animationDelay: `${animationIndex * 50}ms`, // Stagger only new items
                        } : {}}
                      >
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            🏋️
                          </div>
                        )}
                        {!product.inStock && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-white px-4 py-2 text-sm font-bold">
                              OUT OF STOCK
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-xs mb-1 line-clamp-2 group-hover:text-blue-600">
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-1 mb-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-2.5 h-2.5 ${
                                i < Math.floor(product.rating || 4.5)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] text-gray-500 ml-0.5">
                            ({product.reviews || 0})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {/* Price */}
                          <div className="text-center">
                            {product.priceRange ? (
                              <div className="text-sm font-bold">
                                ${(product.priceRange.min / 100).toFixed(2)} - ${(product.priceRange.max / 100).toFixed(2)}
                              </div>
                            ) : (
                              <div className="text-sm font-bold">
                                ${(product.priceWithTax / 100).toFixed(2)}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Button - Full Width */}
                          {product.inStock ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                // For products with variations, redirect to PDP instead of adding to cart
                                if (product.priceRange) {
                                  window.location.href = `/products/${product.slug}`;
                                } else {
                                  // Add single variant product to cart
                                  addItem({
                                    id: product.id,
                                    variantId: product.id, // Use product id as variant id for single variants
                                    productName: product.name,
                                    price: product.priceWithTax,
                                    image: product.image,
                                    slug: product.slug,
                                    inStock: product.inStock,
                                  });
                                  openCart();
                                }
                              }}
                              className="w-full bg-black text-white py-2 text-xs font-medium hover:bg-gray-800 transition-colors uppercase tracking-wide"
                            >
                              {product.priceRange ? 'CHOOSE OPTIONS' : 'ADD TO CART'}
                            </button>
                          ) : (
                            <button
                              disabled
                              className="w-full bg-gray-400 text-white py-2 text-xs font-medium cursor-not-allowed uppercase tracking-wide"
                            >
                              OUT OF STOCK
                            </button>
                          )}
                        </div>
                      </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center mt-8 mb-8">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="bg-black text-white px-8 py-3 font-medium hover:bg-gray-800 disabled:bg-gray-400 transition-all duration-200 transform hover:scale-105"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading more products...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          Load More Products
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-black border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading products...</p>
        </div>
      </div>
    }>
      <ProductsPageContent />
    </Suspense>
  );
}
