'use client';

import { useQuery } from '@apollo/client/react';
import { GET_FEATURED_PRODUCTS } from '@/lib/graphql/queries';
import { toProductCardData, type SearchResult } from '@/lib/types/product';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';

export function FeaturedProducts() {
  const { addItem, openCart } = useCart();
  
  const { data, loading, error } = useQuery<{
    search: {
      items: SearchResult[];
    };
  }>(GET_FEATURED_PRODUCTS);

  const productCards = (data?.search.items || []).map(toProductCardData);

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
