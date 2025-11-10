'use client';

import { useQuery, useLazyQuery } from '@apollo/client/react';
import { GET_RELATED_PRODUCTS, GET_PRODUCT_BY_SLUG } from '@/lib/graphql/queries';
import { Star, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { useCart } from '@/lib/hooks/useCart';

interface RelatedProductsProps {
  currentProductId: string;
  collections?: Array<{ id: string; name: string; slug: string }>;
}

export function RelatedProducts({ currentProductId, collections }: RelatedProductsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem, openCart } = useCart();
  const [getProductBySlug] = useLazyQuery(GET_PRODUCT_BY_SLUG);
  
  // Determine which collection to query:
  // - If product is in "featured" collection, show featured products
  // - Otherwise, show products from the first non-featured collection
  const isFeatured = collections?.some(c => c.slug === 'featured');
  const collectionSlug = isFeatured 
    ? 'featured'
    : collections?.find(c => c.slug !== 'featured')?.slug;
  
  console.log('[RelatedProducts] Props:', { currentProductId, collections, isFeatured, collectionSlug });
  
  // Query products from the determined collection
  const { data, loading, error } = useQuery<{
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
    skip: !collectionSlug // Don't query if no collection provided
  });

  console.log('[RelatedProducts] Query result:', { data, loading, error, skip: !collectionSlug });
  
  // Convert collection variants to product cards, excluding current product
  const variants = (data?.collection?.productVariants?.items || []);
  const relatedProducts = variants
    .filter((v: any) => v.product.id !== currentProductId) // Exclude current product
    .slice(0, 8) // Limit to 8 products
    .map((v: any) => {
      // Check if product has bundle facet (check the parent facet name/code)
      const facetValues = v.product?.facetValues || [];
      const isBundle = facetValues.some((fv: any) => {
        const facetName = fv.facet?.name?.toLowerCase() || '';
        const facetCode = fv.facet?.code?.toLowerCase() || '';
        return facetName.includes('bundle') || facetCode === 'bundle';
      });
      
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
        isBundle
      };
    });

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
              {/* Bundle Badge */}
              {product.isBundle && (
                <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  Bundle
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
                <span className="font-bold text-sm">
                  ${(product.priceWithTax / 100).toFixed(2)}
                </span>
                
                {product.inStock && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (product.isBundle) {
                        // Fetch bundle details before adding to cart
                        try {
                          const { data } = await getProductBySlug({ variables: { slug: product.slug } });
                          const productData = (data as any)?.product;
                          const bundleComponents = productData?.customFields?.bundleComponents 
                            ? JSON.parse(productData.customFields.bundleComponents)
                            : [];
                          
                          addItem({
                            id: product.id,
                            variantId: product.id,
                            productName: product.name,
                            price: product.priceWithTax,
                            image: product.image,
                            slug: product.slug,
                            inStock: product.inStock,
                            isBundle: true,
                            bundleId: productData?.customFields?.bundleId,
                            bundleComponents: bundleComponents
                          });
                          openCart();
                        } catch (err) {
                          console.error('Error fetching bundle data:', err);
                        }
                      } else {
                        // Add regular product to cart
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
                    className="bg-black text-white px-3 py-1 text-xs font-medium hover:bg-gray-800 transition-colors"
                  >
                    {product.isBundle ? 'Add Bundle' : 'Quick Add'}
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