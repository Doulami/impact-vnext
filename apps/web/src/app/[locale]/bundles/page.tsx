'use client';

import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSearch } from '@/lib/hooks/useSearch';
import { useFacets } from '@/lib/hooks/useSearch';
import { toProductCardData } from '@/lib/types/product';
import { useCart } from '@/lib/hooks/useCart';
import { addBundleToCart } from '@/lib/helpers/bundleCart';
import { Package, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function BundlesPage() {
  const { addItem, openCart } = useCart();
  const apolloClient = useApolloClient();
  
  // Use the same search hook as PLP to fetch products
  const {
    products,
    totalItems,
    facetValues,
    loading,
    error,
  } = useSearch({
    take: 100,
    sort: { name: 'ASC' },
  });
  
  // Get facets to identify bundle facet
  const facets = useFacets(facetValues);
  const bundleFacet = facets.find(f => 
    f.code?.toLowerCase() === 'bundle' || 
    f.name?.toLowerCase().includes('bundle')
  );
  const bundleFacetValueIds = bundleFacet?.values.map(v => v.id) || [];
  
  // Convert to product cards and filter to only show bundles
  const productCards = useMemo(() => {
    return products
      .map(p => toProductCardData(p, bundleFacetValueIds))
      .filter(p => p.isBundle); // Only show bundle products
  }, [products, bundleFacetValueIds]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Nutrition Bundles</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Save money and maximize your results with our expertly curated supplement stacks. 
            Each bundle is designed by nutrition experts to help you reach your fitness goals faster.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <div className="bg-[var(--brand-primary)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-[var(--brand-primary)]" />
            </div>
            <h3 className="font-semibold mb-2">Expertly Curated</h3>
            <p className="text-gray-600 text-sm">Each bundle is designed by our nutrition experts for maximum synergy</p>
          </div>
          <div className="text-center">
            <div className="bg-[var(--success)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[var(--success)]" />
            </div>
            <h3 className="font-semibold mb-2">Better Value</h3>
            <p className="text-gray-600 text-sm">Save up to 25% compared to buying products individually</p>
          </div>
          <div className="text-center">
            <div className="bg-[var(--color-protein)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[var(--color-protein)]" />
            </div>
            <h3 className="font-semibold mb-2">Proven Results</h3>
            <p className="text-gray-600 text-sm">Trusted by thousands of athletes and fitness enthusiasts</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && productCards.length === 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
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
            <p className="text-red-600 font-medium mb-2">Unable to load bundles</p>
            <p className="text-sm text-red-500">
              {error.message}
            </p>
          </div>
        )}

        {/* Bundles Grid - Use same card as PLP */}
        {!loading && productCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productCards.map((product) => {
              const productUrl = `/products/${product.slug}`;
              
              return (
                <Link
                  key={product.id}
                  href={productUrl}
                  className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
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
                    {/* Bundle Badge */}
                    {product.isBundle && (
                      <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Bundle
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
                            // For products with variations, redirect to PDP
                            if (product.priceRange) {
                              window.location.href = `/products/${product.slug}`;
                            } else if (product.isBundle) {
                              // Use unified bundle helper
                              addBundleToCart({
                                slug: product.slug,
                                productId: product.id,
                                productName: product.name,
                                image: product.image,
                                quantity: 1,
                                apolloClient
                              })
                                .then(cartItem => {
                                  addItem(cartItem);
                                  openCart();
                                })
                                .catch(err => {
                                  console.error('[BundlesPage] Error adding bundle:', err);
                                });
                            } else {
                              // Add single variant product to cart
                              addItem({
                                id: product.id,
                                variantId: product.id,
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
                          {product.isBundle ? 'ADD BUNDLE' : product.priceRange ? 'CHOOSE OPTIONS' : 'ADD TO CART'}
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
        )}

        {/* Empty State */}
        {!loading && productCards.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Bundles Available</h3>
            <p className="text-gray-500">Check back soon for new bundle offers!</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
