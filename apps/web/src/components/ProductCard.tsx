'use client';

import { Star, Package } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';
import { useApolloClient } from '@apollo/client/react';
import { addBundleToCart } from '@/lib/helpers/bundleCart';

interface ProductCardProps {
  product: {
    id: string;
    productId: string;
    name: string;
    slug: string;
    description?: string;
    image?: string;
    priceWithTax: number;
    priceRange?: { min: number; max: number };
    inStock: boolean;
    rating?: number;
    reviews?: number;
    isBundle?: boolean;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const apolloClient = useApolloClient();

  return (
    <Link
      href={`/products/${product.slug}`}
      className="bg-white border border-gray-200 hover:shadow-lg transition-shadow flex-shrink-0 w-64 group"
    >
      <div className="aspect-square bg-gray-50 flex items-center justify-center p-4 relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-6xl">🏋️</div>
        )}
        {/* Bundle Badge */}
        {product.isBundle && (
          <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
            <Package className="w-3 h-3" />
            Bundle
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
          {product.name}
        </h3>
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
              // For products with variations, redirect to PDP
              if (product.priceRange) {
                window.location.href = `/products/${product.slug}`;
              } else if (product.isBundle) {
                // Use unified bundle helper
                addBundleToCart({
                  slug: product.slug,
                  productId: product.productId,
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
                    console.error('[ProductCard] Error adding bundle:', err);
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
            className="w-full bg-black text-white py-2.5 text-xs font-medium hover:bg-gray-800 transition-colors uppercase tracking-wide"
          >
            {product.isBundle ? 'ADD BUNDLE' : product.priceRange ? 'CHOOSE OPTIONS' : 'ADD TO CART'}
          </button>
        </div>
      </div>
    </Link>
  );
}
