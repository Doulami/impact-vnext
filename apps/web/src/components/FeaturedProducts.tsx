'use client';

import { useQuery } from '@apollo/client/react';
import { GET_FEATURED_PRODUCTS, GET_BUNDLES } from '@/lib/graphql/queries';
import { toProductCardData, type SearchResult } from '@/lib/types/product';
import { Star, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';

export function FeaturedProducts() {
  const { addItem, openCart } = useCart();
  
  const { data: productsData, loading: productsLoading, error: productsError } = useQuery<{
    search: {
      items: SearchResult[];
    };
  }>(GET_FEATURED_PRODUCTS);

  const { data: bundlesData, loading: bundlesLoading } = useQuery(GET_BUNDLES, {
    variables: {
      options: {
        filter: { enabled: { eq: true } },
        take: 3
      }
    },
    errorPolicy: 'all'
  });

  const productCards = (productsData?.search.items || []).map(toProductCardData);
  const bundles = (bundlesData as any)?.bundles?.items || [];
  
  const loading = productsLoading || bundlesLoading;
  const error = productsError;

  if (loading) {
    return (
      <section id="journey-section" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 id="journey-title" className="text-3xl font-bold text-center mb-12">
            Your journey starts here
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-64 animate-pulse">
                <div className="bg-gray-200 aspect-square rounded mb-4"></div>
                <div className="bg-gray-200 h-4 rounded mb-2"></div>
                <div className="bg-gray-200 h-3 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="journey-section" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 id="journey-title" className="text-3xl font-bold text-center mb-12">
            Your journey starts here
          </h2>
          <div className="text-center text-gray-500">
            <p>Unable to load featured products</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="journey-section" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 id="journey-title" className="text-3xl font-bold text-center mb-12">
          Your journey starts here
        </h2>

          <div id="products-carousel" className="relative">
            <div className="flex gap-6 overflow-x-auto pb-4">
              {/* Bundle Cards */}
              {bundles.map((bundle: any) => {
                const componentTotal = bundle.items?.reduce((sum: number, item: any) => sum + item.unitPrice, 0) || 0;
                const savings = componentTotal - bundle.price;
                const getMockImage = (name: string) => {
                  if (name.toLowerCase().includes('performance')) return '/products/bundle-performance.jpg';
                  if (name.toLowerCase().includes('muscle')) return '/products/bundle-muscle.jpg';
                  if (name.toLowerCase().includes('lean')) return '/products/bundle-lean.jpg';
                  if (name.toLowerCase().includes('strength')) return '/products/bundle-strength.jpg';
                  return '/products/bundle-default.jpg';
                };
                return (
                  <Link
                    key={`bundle-${bundle.id}`}
                    href={`/products/${bundle.slug || `bundle-${bundle.id}`}`}
                    className="bg-white border border-gray-200 hover:shadow-lg transition-shadow flex-shrink-0 w-64 group relative"
                  >
                    <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 relative">
                      <img
                        src={getMockImage(bundle.name)}
                        alt={bundle.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/product-placeholder.svg';
                        }}
                      />
                      {/* Bundle Badge */}
                      <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Bundle
                      </div>
                      {/* Savings Badge */}
                      {savings > 0 && (
                        <div className="absolute top-2 right-2 bg-[var(--danger)] text-white px-2 py-1 rounded text-xs font-bold">
                          Save ${savings.toFixed(0)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-sm mb-1 group-hover:text-[var(--brand-primary)] transition-colors">{bundle.name}</h3>
                      <p className="text-xs text-gray-600 mb-2">{bundle.items?.length || 0} Products • Bundle</p>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">(127)</span>
                      </div>
                      <div className="space-y-3">
                        <div className="text-center">
                          <div className="text-lg font-bold">${bundle.price.toFixed(2)}</div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/products/${bundle.slug || `bundle-${bundle.id}`}`;
                          }}
                          className="w-full bg-[var(--brand-secondary)] text-white py-2.5 text-xs font-medium hover:bg-[var(--brand-secondary)]/90 transition-colors uppercase tracking-wide"
                        >
                          VIEW BUNDLE
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
              
              {/* Product Cards */}
              {productCards.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="bg-white border border-gray-200 hover:shadow-lg transition-shadow flex-shrink-0 w-64 group"
                >
                <div className="aspect-square bg-gray-50 flex items-center justify-center p-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-6xl">🏋️</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                  <p className="text-xs text-gray-600 mb-2">Premium Quality</p>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(product.rating || 4.5)
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      ({product.reviews || 0})
                    </span>
                  </div>
                  <div className="space-y-3">
                    {/* Price */}
                    <div className="text-center">
                      {product.priceRange ? (
                        <div className="text-lg font-bold">
                          ${(product.priceRange.min / 100).toFixed(2)} - ${(product.priceRange.max / 100).toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-lg font-bold">
                          ${(product.priceWithTax / 100).toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    {/* Action Button - Full Width */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // For products with variations, redirect to PDP instead of adding to cart
                        if (product.priceRange) {
                          window.location.href = `/products/${product.slug}`;
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
                      className="w-full bg-black text-white py-2.5 text-xs font-medium hover:bg-gray-800 transition-colors uppercase tracking-wide"
                    >
                      {product.priceRange ? 'CHOOSE OPTIONS' : 'ADD TO CART'}
                    </button>
                  </div>
                </div>
                </Link>
              ))}
          </div>
          <button className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg p-2 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-lg p-2 rounded-full">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
}
