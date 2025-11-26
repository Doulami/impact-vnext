'use client';

import { useParams } from 'next/navigation';
import React, { useState, useEffect, Fragment } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_BUNDLE } from '@/lib/graphql/queries';
import { useProduct, useBundle } from '@/lib/hooks/useLanguageAwareQuery';
import { Star, Heart, Share2, Truck, Shield, RotateCcw, Plus, Minus, ArrowLeft, ShoppingCart, Package, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductReviews } from '@/components/ProductReviews';
import { RelatedProducts } from '@/components/RelatedProducts';
import { useCart } from '@/lib/hooks/useCart';
import { useLanguage } from '@/lib/contexts/LanguageContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { VariantSelector } from '@/components/VariantSelector';
import type { Bundle, BundleItem, NutritionBatch } from '@/lib/types/product';

interface ProductOption {
  id: string;
  name: string;
  code: string;
  groupId: string;
}

interface ProductOptionGroup {
  id: string;
  name: string;
  code: string;
  options: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

interface ProductVariant {
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
  options: ProductOption[];
  currentNutritionBatch?: NutritionBatch;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  featuredAsset?: {
    id: string;
    preview: string;
    source: string;
  };
  assets?: Array<{
    id: string;
    preview: string;
    source: string;
  }>;
  collections?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  customFields?: {
    isBundle?: boolean;
    bundleId?: string;
  };
  optionGroups: ProductOptionGroup[];
  variants: ProductVariant[];
}

// Bundle types are now imported from @/lib/types/product


export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { language } = useLanguage();
  const t = useTranslations('pdp');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedBundleComponentIndex, setSelectedBundleComponentIndex] = useState(0);
  // Track selected variant per bundle component (key: bundleItemId, value: variantId)
  const [bundleComponentVariants, setBundleComponentVariants] = useState<Record<string, string>>({});
  const [isOverviewAccordionOpen, setIsOverviewAccordionOpen] = useState(false);
  const [isNutritionAccordionOpen, setIsNutritionAccordionOpen] = useState(false);
  const [isRecommendedUseAccordionOpen, setIsRecommendedUseAccordionOpen] = useState(false);
  const [isStorageAdviceAccordionOpen, setIsStorageAdviceAccordionOpen] = useState(false);
  const [isWarningsAccordionOpen, setIsWarningsAccordionOpen] = useState(false);
  const { addItem, openCart } = useCart();

  // Query for product using language-aware hook
  const { 
    data: productData, 
    loading: productLoading, 
    error: productError,
    currentLanguage,
    isUsingFallback
  } = useProduct(slug);

  const product = (productData as any)?.product;
  const isBundle = product?.customFields?.isBundle === true;
  const bundleId = product?.customFields?.bundleId;

  // If this is a bundle shell, fetch Bundle entity for component details
  const { 
    data: bundleData, 
    loading: bundleLoading, 
    error: bundleError 
  } = useBundle(bundleId || '', {
    skip: !isBundle || !bundleId,
  });

  const bundle = (bundleData as any)?.bundle;
  const loading = productLoading;
  const error = productError;
  
  // Log language information for debugging
  useEffect(() => {
    if (product && currentLanguage) {
      console.log(`[PDP] Product '${product.name}' loaded in language: ${currentLanguage}${isUsingFallback ? ' (fallback)' : ''}`);
    }
  }, [product, currentLanguage, isUsingFallback]);
  
  // Helper function to find variant by selected options
  const findVariantByOptions = (optionsMap: Record<string, string>) => {
    if (!product?.variants) return null;
    
    return product.variants.find(variant => {
      // Check if this variant matches all selected options
      return Object.entries(optionsMap).every(([groupId, optionId]) => {
        return variant.options.some(opt => opt.groupId === groupId && opt.id === optionId);
      });
    });
  };
  
  // Get selected variant based on selected options
  const selectedVariant = selectedVariantId 
    ? product?.variants.find(v => v.id === selectedVariantId)
    : findVariantByOptions(selectedOptions) || product?.variants[0];
  
  // Initialize bundle component variants when bundle loads
  useEffect(() => {
    if (bundle?.items && Object.keys(bundleComponentVariants).length === 0) {
      const initialVariants: Record<string, string> = {};
      bundle.items.forEach(item => {
        initialVariants[item.id] = item.productVariant.id;
      });
      setBundleComponentVariants(initialVariants);
    }
  }, [bundle?.items]);

  // Initialize default options when product loads
  if (product && Object.keys(selectedOptions).length === 0 && product.variants.length > 0 && product.optionGroups?.length > 0) {
    const defaultVariant = product.variants[0];
    const defaultOptionsMap: Record<string, string> = {};
    
    defaultVariant.options.forEach(opt => {
      defaultOptionsMap[opt.groupId] = opt.id;
    });
    
    setSelectedOptions(defaultOptionsMap);
    setSelectedVariantId(defaultVariant.id);
  }

  // Get images from product (works for both regular products and bundle shells)
  // For regular products with variants, prioritize selected variant's image
  const getProductImages = () => {
    const imageList: string[] = [];
    
    // For non-bundle products, show selected variant image first if available
    if (!isBundle && selectedVariant?.featuredAsset?.preview) {
      imageList.push(selectedVariant.featuredAsset.preview);
    }
    
    // Add product featured asset
    if (product?.featuredAsset?.preview) {
      imageList.push(product.featuredAsset.preview);
    }
    
    // Add other product assets
    if (product?.assets) {
      imageList.push(...product.assets.map(a => a.preview));
    }
    
    // Add other variant images (excluding the selected one)
    if (product?.variants) {
      product.variants.forEach(v => {
        if (v.featuredAsset?.preview && v.id !== selectedVariant?.id) {
          imageList.push(v.featuredAsset.preview);
        }
      });
    }
    
    // Deduplicate and filter out undefined
    return Array.from(new Set(imageList.filter(Boolean)));
  };
  
  const images = getProductImages();
  
  // Reset image index to 0 when variant changes (to show variant image)
  useEffect(() => {
    if (!isBundle && selectedVariant) {
      setSelectedImageIndex(0);
    }
  }, [selectedVariant?.id, isBundle]);

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAddToCart = () => {
    if (isBundle && product && bundle) {
      // Calculate component total for savings display
      const componentTotal = bundle.items.reduce((sum, item) => sum + (item.productVariant?.priceWithTax || 0) * item.quantity, 0);
      
      // CRITICAL: Use shell product's first variant ID (same as unified helper)
      const shellVariantId = product.variants[0]?.id || product.id;
      
      addItem({
        id: product.id,
        variantId: shellVariantId, // MUST match other pages
        productName: product.name,
        price: selectedVariant?.priceWithTax || 0,
        originalPrice: componentTotal,
        image: product.featuredAsset?.preview || '/product-placeholder.svg',
        slug: product.slug,
        inStock: bundle.items.length > 0, // Bundle is in stock if it has components
        quantity: quantity,
        isBundle: true,
        bundleId: bundleId,
        bundleComponents: bundle.items // Use Bundle entity items directly
      });
    } else if (selectedVariant && product) {
      // Add regular product to cart
      const image = product.featuredAsset?.preview || selectedVariant.featuredAsset?.preview;
      
      addItem({
        id: product.id,
        variantId: selectedVariant.id,
        productName: product.name,
        variantName: selectedVariant.name !== product.name ? selectedVariant.name : undefined,
        price: price,
        image: image,
        slug: product.slug,
        inStock: isInStock,
        quantity: quantity
      });
    }
    
    // Open cart drawer to show the added item
    openCart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="aspect-square bg-gray-200 rounded"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || (!product && !bundle)) {
    return (
      <div className="min-h-screen bg-[var(--muted)]">
        <Header />
        
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">
            {isBundle ? t('bundleNotFound') : t('productNotFound')}
          </h1>
          <p className="text-gray-600 mb-6">
            {isBundle ? t('bundleNotFoundDesc') : t('productNotFoundDesc')}
          </p>
          <Link href={isBundle ? `/${locale}/bundles` : `/${locale}/products`}>
            <Button>
              {isBundle ? t('browseBundles') : t('browseProducts')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentItem = product; // Always use shell product for consistent breadcrumbs/title/metadata
  
  // Bundle availability check - match bundles listing page logic
  const isBundleAvailable = () => {
    if (!isBundle || !bundle) return false;
    
    // Must be ACTIVE status
    if (bundle.status !== 'ACTIVE') return false;
    
    const now = new Date();
    
    // Check validFrom date
    if (bundle.validFrom) {
      const validFrom = new Date(bundle.validFrom);
      if (now < validFrom) return false;
    }
    
    // Check validTo date
    if (bundle.validTo) {
      const validTo = new Date(bundle.validTo);
      if (now > validTo) return false;
    }
    
    return true;
  };
  
  const isInStock = isBundle 
    ? isBundleAvailable()
    : selectedVariant?.stockLevel !== 'OUT_OF_STOCK';
  
  // Price logic:
  // - For bundles: use shell variant priceWithTax (Vendure applies tax to variant.price)
  // - For regular products: use variant priceWithTax
  // - Both are in cents and include tax calculated by Vendure
  const price = selectedVariant?.priceWithTax || 0;
  
  // Calculate component total for display (use priceWithTax from variants for consistency)
  // NOTE: This reflects the selected variant prices, not just the default variants
  const componentTotal = isBundle && bundle
    ? bundle.items.reduce((sum, item) => {
        // Get the selected variant ID (or default to the item's original variant)
        const currentVariantId = bundleComponentVariants[item.id] || item.productVariant.id;
        // Find the full variant object from the product's variants
        const currentVariant = item.productVariant.product?.variants?.find(v => v.id === currentVariantId) || item.productVariant;
        return sum + (currentVariant.priceWithTax * item.quantity);
      }, 0)
    : 0;
  
  // Calculate bundle savings dynamically based on selected variants
  // Savings = Individual Total (selected variants) - Bundle Price (fixed)
  const bundleSavings = isBundle && bundle
    ? componentTotal - price
    : 0;
  
  // Determine if all multi-variant components have been selected
  // If any component has multiple variants but no selection made, hide pricing until selected
  const areAllVariantsSelected = isBundle && bundle
    ? bundle.items.every((item) => {
        const hasMultipleVariants = (item.productVariant.product?.variants?.length || 0) > 1;
        // If single variant, always considered "selected"
        if (!hasMultipleVariants) return true;
        // If multiple variants, check if user has made a selection
        return bundleComponentVariants[item.id] !== undefined;
      })
    : true; // For non-bundles, always show pricing

  // Get current nutrition batch for selected variant
  const currentNutritionBatch = selectedVariant?.currentNutritionBatch;

  // Generate short description: from nutrition batch or fallback to truncated description
  const getShortDescription = () => {
    // Primary: Use nutrition batch shortLabelDescription (already resolved server-side)
    if (currentNutritionBatch?.shortLabelDescription) {
      return currentNutritionBatch.shortLabelDescription;
    }
    
    // Fallback: Truncate product description to ~150-200 chars
    if (product?.description) {
      const plainText = product.description.replace(/<[^>]*>/g, ''); // Strip HTML
      if (plainText.length <= 200) return plainText;
      return plainText.substring(0, 200).trim() + '…';
    }
    
    return null;
  };

  const shortDescription = getShortDescription();
  
  // Debug: Log shortDescription to see what we're rendering
  if (currentNutritionBatch?.shortLabelDescription) {
    console.log('[PDP] shortLabelDescription type:', typeof currentNutritionBatch.shortLabelDescription);
    console.log('[PDP] shortLabelDescription value:', currentNutritionBatch.shortLabelDescription);
    console.log('[PDP] shortDescription (final):', shortDescription);
  }

  // Get nutrition batch for display
  // For bundles: use selected component's nutrition batch
  // For regular products: use selected variant's nutrition batch
  const getNutritionBatchForDisplay = () => {
    if (isBundle && bundle?.items && bundle.items.length > 0) {
      const sortedItems = [...bundle.items].sort((a, b) => a.displayOrder - b.displayOrder);
      const selectedItem = sortedItems[selectedBundleComponentIndex];
      return selectedItem?.productVariant?.currentNutritionBatch;
    }
    return currentNutritionBatch;
  };

  const displayNutritionBatch = getNutritionBatchForDisplay();

  // Group nutrition rows by nutrient group
  const groupedRows = displayNutritionBatch?.rows?.reduce((acc, row) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push(row);
    return acc;
  }, {} as Record<string, typeof displayNutritionBatch.rows>) || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header />

      {/* Breadcrumb with Back Button */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={`/${locale}/products`} 
                className="flex items-center gap-2 text-black hover:text-gray-600 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('backToProducts')}
              </Link>
              <div className="w-px h-4 bg-gray-300"></div>
              <nav className="flex items-center space-x-2 text-sm text-gray-600">
                <Link href={`/${locale}/`} className="hover:text-black">{t('home')}</Link>
                <span>/</span>
                <Link href={`/${locale}/products`} className="hover:text-black">{t('products')}</Link>
                <span>/</span>
                <span className="text-black font-medium">{currentItem?.name}</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column: Images + Product Overview */}
          <div className="space-y-6">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-square bg-white rounded-lg overflow-hidden">
                {images[selectedImageIndex] ? (
                  <img
                    src={images[selectedImageIndex]}
                    alt={currentItem?.name}
                    className="w-full h-full object-contain p-8"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    🏋️
                  </div>
                )}
              </div>
              
              {/* Image Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                        selectedImageIndex === index ? 'border-black' : 'border-gray-300'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${currentItem?.name} ${index + 1}`}
                        className="w-full h-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Overview Accordion */}
            {product?.description && (
              <div className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsOverviewAccordionOpen(!isOverviewAccordionOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold">{t('productOverview')}</h3>
                  <div className={`rounded-full p-2 transition-colors ${
                    isOverviewAccordionOpen ? 'bg-slate-900' : 'bg-white border-2 border-slate-200'
                  }`}>
                    <ChevronDown className={`w-4 h-4 transition-all ${
                      isOverviewAccordionOpen ? 'rotate-180 text-white' : 'text-slate-900'
                    }`} />
                  </div>
                </button>
                {isOverviewAccordionOpen && (
                  <div className="p-4 md:p-6 bg-gray-50">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: product.description }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Nutritional Information Accordion */}
            <div className="rounded-lg overflow-hidden">
              <button
                onClick={() => setIsNutritionAccordionOpen(!isNutritionAccordionOpen)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-lg font-semibold">{t('nutritionalInformation')}</h3>
                <div className={`rounded-full p-2 transition-colors ${
                  isNutritionAccordionOpen ? 'bg-slate-900' : 'bg-white border-2 border-slate-200'
                }`}>
                  <ChevronDown className={`w-4 h-4 transition-all ${
                    isNutritionAccordionOpen ? 'rotate-180 text-white' : 'text-slate-900'
                  }`} />
                </div>
              </button>

              {isNutritionAccordionOpen && (
                <div className="p-4 md:p-6 bg-gray-50">
                  {/* Bundle Component Selector */}
                  {isBundle && bundle?.items && bundle.items.length > 1 && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('selectComponent')}
                      </label>
                      {/* Mobile: Dropdown */}
                      <select
                        value={selectedBundleComponentIndex}
                        onChange={(e) => setSelectedBundleComponentIndex(Number(e.target.value))}
                        className="w-full md:hidden px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      >
                        {[...bundle.items]
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((item, index) => (
                            <option key={item.id} value={index}>
                              {item.productVariant.name}
                            </option>
                          ))}
                      </select>
                      {/* Desktop: Tabs */}
                      <div className="hidden md:flex flex-wrap gap-2">
                        {[...bundle.items]
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((item, index) => (
                            <button
                              key={item.id}
                              onClick={() => setSelectedBundleComponentIndex(index)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedBundleComponentIndex === index
                                  ? 'bg-black text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {item.productVariant.name}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {displayNutritionBatch ? (
                    <div className="space-y-6">
                      {/* Composition / Nutrition Facts */}
                      <div>
                        <h4 className="text-base font-semibold mb-3">{t('compositionNutritionFacts')}</h4>
                        {displayNutritionBatch.servingLabel && (
                          <p className="text-sm text-gray-600 mb-4">
                            {t('servingSize')} {displayNutritionBatch.servingSizeValue}{displayNutritionBatch.servingSizeUnit} ({displayNutritionBatch.servingLabel})
                            {displayNutritionBatch.servingsPerContainer && (
                              <span className="ml-2">• {displayNutritionBatch.servingsPerContainer} {t('servingsPerContainer')}</span>
                            )}
                          </p>
                        )}
                        
                        {/* Desktop: Table */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-2 pr-4 font-semibold">{t('nutrient')}</th>
                                <th className="text-right py-2 px-4 font-semibold">{t('perServing')}</th>
                                <th className="text-right py-2 px-4 font-semibold">{t('per100g')}</th>
                                <th className="text-right py-2 pl-4 font-semibold">{t('ri')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(groupedRows).map(([group, rows]) => (
                                <Fragment key={`group-${group}`}>
                                  <tr className="bg-gray-100">
                                    <td colSpan={4} className="py-2 px-2 font-medium text-xs uppercase text-gray-600">
                                      {group}
                                    </td>
                                  </tr>
                                  {rows
                                    .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                                    .map((row: any) => (
                                      <tr key={row.id} className="border-b border-gray-200">
                                        <td className="py-2 pr-4">{row.name}</td>
                                        <td className="text-right py-2 px-4">
                                          {row.valuePerServing != null ? `${row.valuePerServing}${row.unit}` : '-'}
                                        </td>
                                        <td className="text-right py-2 px-4">
                                          {row.valuePer100g != null ? `${row.valuePer100g}${row.unit}` : '-'}
                                        </td>
                                        <td className="text-right py-2 pl-4">
                                          {row.referenceIntakePercentPerServing != null ? `${row.referenceIntakePercentPerServing}%` : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                </Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile: Cards */}
                        <div className="md:hidden space-y-3">
                          {Object.entries(groupedRows).map(([group, rows]) => (
                            <div key={`group-${group}`}>
                              <div className="text-xs uppercase font-medium text-gray-600 mb-2">{group}</div>
                              {rows
                                .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                                .map((row: any) => (
                                  <div key={row.id} className="bg-white rounded-lg p-3 mb-2 border">
                                    <div className="font-medium mb-2">{row.name}</div>
                                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                                      <div>
                                        <div className="text-xs text-gray-500">{t('perServing')}</div>
                                        <div className="font-medium">
                                          {row.valuePerServing != null ? `${row.valuePerServing}${row.unit}` : '-'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500">{t('per100g')}</div>
                                        <div className="font-medium">
                                          {row.valuePer100g != null ? `${row.valuePer100g}${row.unit}` : '-'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500">{t('ri')}</div>
                                        <div className="font-medium">
                                          {row.referenceIntakePercentPerServing != null ? `${row.referenceIntakePercentPerServing}%` : '-'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ingredients */}
                      {displayNutritionBatch.ingredientsText && (
                        <div className="border-t pt-6">
                          <h4 className="text-base font-semibold mb-3">{t('ingredients')}</h4>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div dangerouslySetInnerHTML={{ __html: displayNutritionBatch.ingredientsText }} />
                          </div>
                        </div>
                      )}

                      {/* Allergy Advice */}
                      {displayNutritionBatch.allergyAdviceText && (
                        <div className="border-t pt-6">
                          <h4 className="text-base font-semibold mb-3">{t('allergyAdvice')}</h4>
                          <div className="text-sm text-gray-700 leading-relaxed">
                            <div dangerouslySetInnerHTML={{ __html: displayNutritionBatch.allergyAdviceText }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>{t('nutritionComingSoon')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recommended Use Accordion */}
            {displayNutritionBatch?.recommendedUseText && (
              <div className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsRecommendedUseAccordionOpen(!isRecommendedUseAccordionOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold">{t('recommendedUse')}</h3>
                  <div className={`rounded-full p-2 transition-colors ${
                    isRecommendedUseAccordionOpen ? 'bg-slate-900' : 'bg-white border-2 border-slate-200'
                  }`}>
                    <ChevronDown className={`w-4 h-4 transition-all ${
                      isRecommendedUseAccordionOpen ? 'rotate-180 text-white' : 'text-slate-900'
                    }`} />
                  </div>
                </button>
                {isRecommendedUseAccordionOpen && (
                  <div className="p-4 md:p-6 bg-gray-50">
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: displayNutritionBatch.recommendedUseText }} />
                    </div>
                    {displayNutritionBatch.referenceIntakeFootnoteText && (
                      <div className="text-xs text-gray-500 mt-4 pt-4 border-t">
                        <div dangerouslySetInnerHTML={{ __html: displayNutritionBatch.referenceIntakeFootnoteText }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Storage Advice Accordion */}
            {displayNutritionBatch?.storageAdviceText && (
              <div className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsStorageAdviceAccordionOpen(!isStorageAdviceAccordionOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold">{t('storageAdvice')}</h3>
                  <div className={`rounded-full p-2 transition-colors ${
                    isStorageAdviceAccordionOpen ? 'bg-slate-900' : 'bg-white border-2 border-slate-200'
                  }`}>
                    <ChevronDown className={`w-4 h-4 transition-all ${
                      isStorageAdviceAccordionOpen ? 'rotate-180 text-white' : 'text-slate-900'
                    }`} />
                  </div>
                </button>
                {isStorageAdviceAccordionOpen && (
                  <div className="p-4 md:p-6 bg-gray-50">
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: displayNutritionBatch.storageAdviceText }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Warnings Accordion */}
            {displayNutritionBatch?.warningsText && (
              <div className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsWarningsAccordionOpen(!isWarningsAccordionOpen)}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold">{t('warnings')}</h3>
                  <div className={`rounded-full p-2 transition-colors ${
                    isWarningsAccordionOpen ? 'bg-slate-900' : 'bg-white border-2 border-slate-200'
                  }`}>
                    <ChevronDown className={`w-4 h-4 transition-all ${
                      isWarningsAccordionOpen ? 'rotate-180 text-white' : 'text-slate-900'
                    }`} />
                  </div>
                </button>
                {isWarningsAccordionOpen && (
                  <div className="p-4 md:p-6 bg-gray-50">
                    <div className="text-sm text-gray-700 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: displayNutritionBatch.warningsText }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{currentItem?.name}</h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">(127 {t('reviews')})</span>
              </div>
            </div>

            {/* Short Description - From Nutrition Batch or Fallback */}
            {shortDescription && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm md:text-base text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: shortDescription }} />
              </div>
            )}

            {/* Price - Only show for non-bundles or bundles with all variants selected */}
            {areAllVariantsSelected && (
              <div>
                <div className="text-3xl font-bold">
                  ${(price / 100).toFixed(2)}
                </div>
<<<<<<< HEAD:apps/web/src/app/[locale]/products/[slug]/page.tsx
              )}
              {!isBundle && selectedVariant?.sku && (
                <span className="text-sm text-gray-600 mt-2 block">{t('sku')} {selectedVariant.sku}</span>
              )}
            </div>
=======
                {isBundle && componentTotal > price && (
                  <div className="text-lg text-gray-500 line-through mt-1">
                    ${(componentTotal / 100).toFixed(2)}
                  </div>
                )}
                {!isBundle && selectedVariant?.sku && (
                  <span className="text-sm text-gray-600 mt-2 block">SKU: {selectedVariant.sku}</span>
                )}
              </div>
            )}
>>>>>>> 270cbf117859c61bdcc96dc3e9cc3d5e343208a5:apps/web/src/app/products/[slug]/page.tsx
            
            {/* Bundle Savings - Only show when all variants selected */}
            {isBundle && bundleSavings > 0 && areAllVariantsSelected && (
              <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <Package className="w-5 h-5" />
                  {t('bundleSavings')} ${(bundleSavings / 100).toFixed(2)}
                </div>
                <p className="text-sm text-[var(--success)]/70 mt-1">
                  Save {componentTotal > 0 ? Math.round((bundleSavings / componentTotal) * 100) : 0}% compared to buying separately
                </p>
              </div>
            )}

            {/* Variant Selection - Dropdown per Option Group */}
            {!isBundle && product?.optionGroups && product.optionGroups.length > 0 && product.variants && (
              <VariantSelector
                optionGroups={product.optionGroups}
                variants={product.variants}
                selectedOptions={selectedOptions}
                onVariantChange={(variantId, newOptions) => {
                  setSelectedVariantId(variantId);
                  setSelectedOptions(newOptions);
                }}
              />
            )}
            
            {/* Bundle Components - Show before Add to Cart */}
            {isBundle && bundle?.items && bundle.items.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">{t('whatsIncluded')}</h3>
                <div className="space-y-3">
                  {[...bundle.items]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((item) => {
                      // Get the selected variant ID (or default to the item's original variant)
                      const currentVariantId = bundleComponentVariants[item.id] || item.productVariant.id;
                      // Find the full variant object from the product's variants
                      const currentVariant = item.productVariant.product?.variants?.find(v => v.id === currentVariantId) || item.productVariant;
                      
                      // Use priceWithTax for consistency with regular products (already in cents)
                      const itemTotal = currentVariant.priceWithTax * item.quantity;
                      const itemImage = currentVariant.featuredAsset?.preview || item.productVariant.product?.featuredAsset?.preview;
                      const hasMultipleVariants = (item.productVariant.product?.variants?.length || 0) > 1;
                      
                      return (
<<<<<<< HEAD:apps/web/src/app/[locale]/products/[slug]/page.tsx
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                          <div className="w-14 h-14 bg-gray-50 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {itemImage ? (
                              <img src={itemImage} alt={item.productVariant.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-8 h-8 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{item.productVariant.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{t('sku')} {item.productVariant.sku}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium">${(itemTotal / 100).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">{t('qty')} {item.quantity}</div>
=======
                        <div key={item.id} className="p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gray-50 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {itemImage ? (
                                <img src={itemImage} alt={currentVariant.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-8 h-8 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm">{item.productVariant.product?.name || currentVariant.name}</h4>
                              {hasMultipleVariants && (
                                <p className="text-xs text-gray-500 mt-0.5">{currentVariant.name}</p>
                              )}
                              {!hasMultipleVariants && (
                                <p className="text-xs text-gray-500 mt-0.5">SKU: {currentVariant.sku}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium">${(itemTotal / 100).toFixed(2)}</div>
                              <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                            </div>
>>>>>>> 270cbf117859c61bdcc96dc3e9cc3d5e343208a5:apps/web/src/app/products/[slug]/page.tsx
                          </div>
                          
                          {/* Variant Selector - Show if product has multiple variants */}
                          {hasMultipleVariants && item.productVariant.product?.optionGroups && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <VariantSelector
                                optionGroups={item.productVariant.product.optionGroups}
                                variants={item.productVariant.product.variants!}
                                selectedOptions={currentVariant.options.reduce((acc, opt) => {
                                  acc[opt.groupId] = opt.id;
                                  return acc;
                                }, {} as Record<string, string>)}
                                onVariantChange={(variantId) => {
                                  setBundleComponentVariants(prev => ({
                                    ...prev,
                                    [item.id]: variantId
                                  }));
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
<<<<<<< HEAD:apps/web/src/app/[locale]/products/[slug]/page.tsx
                <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-gray-700">{t('individualTotal')}</span>
                    <span className="font-semibold text-gray-900">${(componentTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base mb-2">
                    <span className="text-gray-900 font-medium">{t('bundlePrice')}</span>
                    <span className="font-bold text-gray-900">${(price / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-bold text-[var(--success)] border-t border-gray-300 pt-3 mt-2">
                    <span>{t('youSave')}</span>
                    <span className="text-xl">${(bundleSavings / 100).toFixed(2)}</span>
                  </div>
                </div>
=======
                {/* Pricing Summary - Only show when all variants selected */}
                {areAllVariantsSelected && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-gray-700">Individual Total:</span>
                      <span className="font-semibold text-gray-900">${(componentTotal / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-base mb-2">
                      <span className="text-gray-900 font-medium">Bundle Price:</span>
                      <span className="font-bold text-gray-900">${(price / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-base font-bold text-[var(--success)] border-t border-gray-300 pt-3 mt-2">
                      <span>You Save:</span>
                      <span className="text-xl">${(bundleSavings / 100).toFixed(2)}</span>
                    </div>
                  </div>
                )}
>>>>>>> 270cbf117859c61bdcc96dc3e9cc3d5e343208a5:apps/web/src/app/products/[slug]/page.tsx
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="p-2 hover:bg-gray-100"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300 min-w-[60px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="p-2 hover:bg-gray-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex-1">
                  <button
                    onClick={handleAddToCart}
                    disabled={!isInStock}
                    className={`w-full py-3 px-6 font-medium text-white transition-colors uppercase tracking-wide ${
                      isInStock
                        ? 'bg-black hover:bg-gray-800'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5 inline mr-2" />
                    {isInStock ? t('addToCart') : t('outOfStock')}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">{t('addToWishlist')}</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">{t('share')}</span>
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t">
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-xs text-gray-600">{t('freeShipping')}</div>
                <div className="text-xs text-gray-500">{t('ordersOver50')}</div>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-xs text-gray-600">{t('qualityGuarantee')}</div>
                <div className="text-xs text-gray-500">{t('authentic')}</div>
              </div>
              <div className="text-center">
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-xs text-gray-600">{t('easyReturns')}</div>
                <div className="text-xs text-gray-500">{t('dayReturns')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Reviews - For both products and bundles (mock data) */}
        <div className="mt-16">
          <ProductReviews 
            productId={isBundle ? bundle?.id || '' : product?.id || ''}
            averageRating={4.3}
            totalReviews={127}
          />
        </div>

        {/* Related Products - shows collection-based for products, bundle facet for bundles */}
        {product && (
          <div className="mt-16">
            <RelatedProducts 
              currentProductId={product.id}
              collections={product.collections}
              isCurrentProductBundle={isBundle}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
