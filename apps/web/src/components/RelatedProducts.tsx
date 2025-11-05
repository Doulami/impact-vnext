'use client';

import { useQuery } from '@apollo/client/react';
import { GET_FEATURED_PRODUCTS } from '@/lib/graphql/queries';
import { toProductCardData, type SearchResult } from '@/lib/types/product';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';

interface RelatedProductsProps {
  currentProductId: string;
  categoryId?: string;
}

export function RelatedProducts({ currentProductId, categoryId }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // For now, use featured products as related products
  // In a real app, you'd query by category or use recommendation algorithms
  const { data, loading, error } = useQuery<{
    search: {
      items: SearchResult[];
    };
  }>(GET_FEATURED_PRODUCTS);

  const relatedProducts = (data?.search.items || [])
    .filter(product => product.productId !== currentProductId) // Exclude current product
    .slice(0, 8) // Limit to 8 products
    .map(toProductCardData);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-2xl font-bold mb-6">Related Products</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 animate-pulse">
              <div className="aspect-square bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || relatedProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-6 border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Related Products</h2>
        <div className="flex gap-2">
          <button
            onClick={scrollLeft}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-50"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollRight}
            className="p-2 rounded-full border border-gray-300 hover:bg-gray-50"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {relatedProducts.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="flex-shrink-0 w-64 bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow group"
          >
            <div className="aspect-square bg-gray-50 relative overflow-hidden">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  🏋️
                </div>
              )}
              {!product.inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="bg-white px-3 py-1 text-xs font-bold rounded">
                    OUT OF STOCK
                  </span>
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600">
                {product.name}
              </h3>
              
              <div className="flex items-center gap-1 mb-3">
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
                <span className="text-xs text-gray-500 ml-1">
                  ({product.reviews || 0})
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  {product.priceRange ? (
                    <>
                      <span className="font-bold text-sm">
                        ${(product.priceRange.min / 100).toFixed(2)} - ${(product.priceRange.max / 100).toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">Price range</span>
                    </>
                  ) : (
                    <span className="font-bold text-sm">
                      ${(product.priceWithTax / 100).toFixed(2)}
                    </span>
                  )}
                </div>
                
                {product.inStock && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Quick add to cart functionality coming soon!');
                    }}
                    className="bg-black text-white px-3 py-1 text-xs font-medium hover:bg-gray-800 transition-colors"
                  >
                    Quick Add
                  </button>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {relatedProducts.length > 4 && (
        <div className="text-center mt-6">
          <Link
            href="/products"
            className="text-black font-medium hover:underline"
          >
            View All Products →
          </Link>
        </div>
      )}
    </div>
  );
}