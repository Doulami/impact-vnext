'use client';

import { useApolloClient } from '@apollo/client/react';
import { useFeaturedProducts } from '@/lib/hooks/useLanguageAwareQuery';
import { toProductCardData, type SearchResult } from '@/lib/types/product';
import { Star, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/lib/hooks/useCart';
import { addBundleToCart } from '@/lib/helpers/bundleCart';
import { useLocale } from 'next-intl';
import { formatCurrency } from '@/lib/utils/locale-formatting';
import { filterCollectionVariantsByLanguage } from '@/lib/utils/productLanguageValidation';
import { EmptyLanguageState } from '@/components/EmptyLanguageState';

interface FeaturedProductsProps {
  title?: string;
}

export function FeaturedProducts({ title = 'Your journey starts here' }: FeaturedProductsProps = {}) {
  const { addItem, openCart } = useCart();
  const apolloClient = useApolloClient();
  const locale = useLocale();
  
  const { 
    data: productsData, 
    loading: productsLoading, 
    error: productsError, 
    currentLanguage,
    isUsingFallback
  } = useFeaturedProducts();

  // Convert collection variants to card data - use variant ID to avoid duplicates
  const rawVariants = (productsData as any)?.collection?.productVariants?.items || [];
  
  // Filter variants to only include those with valid language data
  const filteredVariants = filterCollectionVariantsByLanguage(rawVariants, locale);
  
  console.log(`[FeaturedProducts] Language: ${locale}, Raw variants: ${rawVariants.length}, Filtered: ${filteredVariants.length}`);
  
  const productCards = filteredVariants.map((v: any) => {
    // Check if product has bundle facet (check the parent facet name/code)
    const facetValues = v.product?.facetValues || [];
    
    console.log('[FeaturedProducts] Checking product:', v.product.name);
    console.log('[FeaturedProducts] Raw facetValues:', facetValues);
    
    const isBundle = facetValues.some((fv: any) => {
      const facetName = fv.facet?.name?.toLowerCase() || '';
      const facetCode = fv.facet?.code?.toLowerCase() || '';
      const matches = facetName.includes('bundle') || facetCode === 'bundle';
      
      console.log('[FeaturedProducts] Checking facetValue:', {
        valueName: fv.name,
        valueCode: fv.code,
        facetName: fv.facet?.name,
        facetCode: fv.facet?.code,
        facetNameLower: facetName,
        facetCodeLower: facetCode,
        matchesBundle: matches
      });
      
      return matches;
    });
    
    console.log('[FeaturedProducts] Final isBundle:', isBundle, 'for product:', v.product.name);
    
    return {
      id: v.id, // Use variant ID, not product ID
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
  const loading = productsLoading;
  const error = productsError;

  if (loading) {
    return (
      <section id="journey-section" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 id="journey-title" className="text-3xl font-bold text-center mb-12">
            {title}
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
            {title}
          </h2>
          <div className="text-center text-gray-500">
            <p>Unable to load featured products</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </div>
      </section>
    );
  }

  // Show empty state if no products available in current language
  if (!loading && productCards.length === 0) {
    return (
      <section id="journey-section" className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 id="journey-title" className="text-3xl font-bold text-center mb-12">
            {title}
          </h2>
          <EmptyLanguageState 
            currentLanguage={locale}
            title={`No featured products available in ${locale === 'ar' ? 'العربية' : locale === 'fr' ? 'Français' : 'English'}`}
          />
        </div>
      </section>
    );
  }

  return (
    <section id="journey-section" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 id="journey-title" className="text-3xl font-bold text-center mb-12">
          {title}
        </h2>

          <div id="products-carousel" className="relative">
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {productCards.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="bg-gray-50 hover:shadow-lg transition-shadow flex-shrink-0 w-52 sm:w-56 md:w-64 group flex flex-col h-[380px] sm:h-[400px] md:h-[420px]"
                >
                <div className="w-full h-40 sm:h-44 md:h-48 bg-gray-100 flex items-center justify-center p-3 md:p-4 relative flex-shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain"
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
                <div className="p-3 md:p-4 flex flex-col flex-1 min-h-0">
                  <h3 className="font-bold text-sm mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">{product.name}</h3>
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
                  
                  <div className="space-y-3 mt-auto">
                    {/* Price - Left aligned */}
                    <div className="text-left">
                      {product.priceRange ? (
                        <div className="text-lg font-bold">
                          {formatCurrency(product.priceRange.min / 100, locale)} - {formatCurrency(product.priceRange.max / 100, locale)}
                        </div>
                      ) : (
                        <div className="text-lg font-bold">
                          {formatCurrency(product.priceWithTax / 100, locale)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Action Button - Full Width at bottom */}
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
                          console.error('[FeaturedProducts] Error adding bundle:', err);
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
                  className="w-full bg-black text-white py-2.5 md:py-3 text-xs font-bold hover:bg-gray-800 transition-colors uppercase tracking-wide"
                >
                  {product.isBundle ? 'ADD BUNDLE' : product.priceRange ? 'CHOOSE OPTIONS' : 'ADD TO CART'}
                </button>
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
