'use client';

import { useQuery } from '@apollo/client/react';
import { GET_RELATED_PRODUCTS, GET_BUNDLES } from '@/lib/graphql/queries';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { ProductCard } from './ProductCard';

interface RelatedProductsProps {
  currentProductId: string;
  collections?: Array<{ id: string; name: string; slug: string }>;
  isCurrentProductBundle?: boolean;
}

export function RelatedProducts({ currentProductId, collections, isCurrentProductBundle }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // If current product is a bundle, query other bundle products via facet
  // Otherwise, use collection-based related products
  const isFeatured = collections?.some(c => c.slug === 'featured');
  const collectionSlug = isFeatured 
    ? 'featured'
    : collections?.find(c => c.slug !== 'featured')?.slug;
  
  console.log('[RelatedProducts] Props:', { currentProductId, collections, isFeatured, collectionSlug, isCurrentProductBundle });
  
  // Query bundle products if current is a bundle (same as bundles listing page)
  const { data: bundleData, loading: bundleLoading, error: bundleError } = useQuery<{
    bundles: {
      items: Array<{
        id: string;
        name: string;
        slug: string;
        description?: string;
        status: string;
        effectivePrice: number;
        featuredAsset?: {
          id: string;
          preview: string;
        };
        shellProduct?: {
          id: string;
          name: string;
          slug: string;
        };
      }>;
    };
  }>(GET_BUNDLES, {
    variables: {
      options: {
        take: 9, // Take 9 to exclude current and show 8
        filter: {
          status: { eq: 'ACTIVE' } // Only show active bundles
        }
      }
    },
    skip: !isCurrentProductBundle
  });
  
  // Query products from collection if NOT a bundle
  const { data: collectionData, loading: collectionLoading, error: collectionError } = useQuery<{
    collection: {
      id: string;
      name: string;
      productVariants: {
        items: Array<{
          id: string;
          name: string;
          sku: string;
          price: number;
          priceWithTax: number;
          stockLevel: string;
          featuredAsset?: {
            id: string;
            preview: string;
          };
          product: {
            id: string;
            name: string;
            slug: string;
            description: string;
            customFields?: {
              isBundle?: boolean;
              bundleId?: string;
            };
            featuredAsset?: {
              id: string;
              preview: string;
            };
          };
        }>;
      };
    };
  }>(GET_RELATED_PRODUCTS, {
    variables: {
      collectionSlug: collectionSlug || 'all-products'
    },
    skip: isCurrentProductBundle || !collectionSlug // Skip if bundle or no collection
  });

  const loading = isCurrentProductBundle ? bundleLoading : collectionLoading;
  const error = isCurrentProductBundle ? bundleError : collectionError;
  
  console.log('[RelatedProducts] Query result:', { bundleData, collectionData, loading, error, isCurrentProductBundle });
  
  // Convert data to product cards based on query type
  let relatedProducts: any[] = [];
  
  if (isCurrentProductBundle && bundleData?.bundles?.items) {
    // Handle bundles query results (same structure as bundles listing)
    relatedProducts = bundleData.bundles.items
      .filter((bundle: any) => bundle.id !== currentProductId)
      .slice(0, 8)
      .map((bundle: any) => {
        return {
          id: bundle.shellProduct?.id || bundle.id,
          productId: bundle.shellProduct?.id || bundle.id,
          name: bundle.shellProduct?.name,
          slug: bundle.shellProduct?.slug,
          description: bundle.shellProduct?.description,
          image: bundle.shellProduct?.featuredAsset?.preview,
          priceWithTax: bundle.effectivePrice, // Bundle price in cents
          inStock: bundle.status === 'ACTIVE',
          rating: 4.5,
          reviews: 0,
          isBundle: true,
          bundleId: bundle.id
        };
      });
  } else if (collectionData?.collection?.productVariants?.items) {
    // Handle collection results
    const variants = collectionData.collection.productVariants.items;
    relatedProducts = variants
      .filter((v: any) => v.product.id !== currentProductId)
      .slice(0, 8)
      .map((v: any) => {
        const isBundle = v.product?.customFields?.isBundle === true;
        const bundleId = v.product?.customFields?.bundleId;
        
        return {
          id: v.id,
          productId: v.product.id,
          name: v.product.name,
          slug: v.product.slug,
          description: v.product.description,
          image: v.product.featuredAsset?.preview,
          priceWithTax: v.priceWithTax,
          inStock: v.stockLevel !== 'OUT_OF_STOCK',
          rating: 4.5,
          reviews: 0,
          isBundle,
          bundleId
        };
      });
  }

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

  console.log('[RelatedProducts] Filtered products:', relatedProducts.length);
  
  if (error || relatedProducts.length === 0) {
    console.log('[RelatedProducts] Returning null:', { error: error?.message, productsLength: relatedProducts.length });
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
          <ProductCard key={product.id} product={product} />
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