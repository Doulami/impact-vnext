'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT_BY_SLUG, GET_BUNDLE } from '@/lib/graphql/queries';
import { Star, Heart, Share2, Truck, Shield, RotateCcw, Plus, Minus, ArrowLeft, ShoppingCart, Package } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductReviews } from '@/components/ProductReviews';
import { RelatedProducts } from '@/components/RelatedProducts';
import { useCart } from '@/lib/hooks/useCart';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import type { Bundle, BundleItem } from '@/lib/types/product';

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
    bundlePrice?: number;
    bundleAvailability?: number;
    bundleComponents?: string;
  };
  variants: ProductVariant[];
}

// Bundle types are now imported from @/lib/types/product

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addItem, openCart } = useCart();

  // Query for product (shell product for both regular products and bundles)
  const { data: productData, loading: productLoading, error: productError } = useQuery<{ product: Product }>(
    GET_PRODUCT_BY_SLUG,
    {
      variables: { slug },
      skip: !slug,
    }
  );

  const product = productData?.product;
  const isBundle = product?.customFields?.isBundle === true;
  const bundleId = product?.customFields?.bundleId;

  // If this is a bundle shell, fetch Bundle entity for component details
  const { data: bundleData, loading: bundleLoading, error: bundleError } = useQuery<{ bundle: Bundle }>(
    GET_BUNDLE,
    {
      variables: { id: bundleId },
      skip: !isBundle || !bundleId,
    }
  );

  const bundle = bundleData?.bundle;
  const loading = productLoading;
  const error = productError;
  const selectedVariant = product?.variants.find(v => v.id === selectedVariantId) || product?.variants[0];

  // Set default variant when product loads
  if (product && !selectedVariantId && product.variants.length > 0) {
    setSelectedVariantId(product.variants[0].id);
  }

  // Get images from product (works for both regular products and bundle shells)
  const images = [
    product?.featuredAsset?.preview,
    ...(product?.assets?.map(a => a.preview) || []),
    ...(product?.variants.map(v => v.featuredAsset?.preview).filter(Boolean) || [])
  ].filter(Boolean) as string[];

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
        inStock: (product.customFields?.bundleAvailability || 0) > 0,
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
            {isBundle ? 'Bundle Not Found' : 'Product Not Found'}
          </h1>
          <p className="text-gray-600 mb-6">
            The {isBundle ? 'bundle' : 'product'} you're looking for doesn't exist.
          </p>
          <Link href={isBundle ? '/bundles' : '/products'}>
            <Button>
              Browse {isBundle ? 'Bundles' : 'Products'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentItem = product; // Always use shell product for consistent breadcrumbs/title/metadata
  const isInStock = isBundle 
    ? (product?.customFields?.bundleAvailability || 0) > 0 
    : selectedVariant?.stockLevel !== 'OUT_OF_STOCK';
  
  // Price logic:
  // - For bundles: use shell variant priceWithTax (Vendure applies tax to variant.price)
  // - For regular products: use variant priceWithTax
  // - Both are in cents and include tax calculated by Vendure
  const price = selectedVariant?.priceWithTax || 0;
  
  // Calculate bundle savings (all in cents)
  const bundleSavings = isBundle && bundle
    ? bundle.totalSavings || 0
    : 0;
  
  // Calculate component total for display (use priceWithTax from variants for consistency)
  const componentTotal = isBundle && bundle
    ? bundle.items.reduce((sum, item) => sum + (item.productVariant.priceWithTax * item.quantity), 0)
    : 0;

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
                href="/products" 
                className="flex items-center gap-2 text-black hover:text-gray-600 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Products
              </Link>
              <div className="w-px h-4 bg-gray-300"></div>
              <nav className="flex items-center space-x-2 text-sm text-gray-600">
                <Link href="/" className="hover:text-black">Home</Link>
                <span>/</span>
                <Link href="/products" className="hover:text-black">Products</Link>
                <span>/</span>
                <span className="text-black font-medium">{currentItem?.name}</span>
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
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

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Rating */}
            <div>
              <h1 className="text-3xl font-bold mb-2">{currentItem?.name}</h1>
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
                <span className="text-sm text-gray-600">(127 reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div>
              <div className="text-3xl font-bold">
                ${(price / 100).toFixed(2)}
              </div>
              {isBundle && componentTotal > price && (
                <div className="text-lg text-gray-500 line-through mt-1">
                  ${(componentTotal / 100).toFixed(2)}
                </div>
              )}
              {!isBundle && selectedVariant?.sku && (
                <span className="text-sm text-gray-600 mt-2 block">SKU: {selectedVariant.sku}</span>
              )}
            </div>
            
            {/* Bundle Savings */}
            {isBundle && bundleSavings > 0 && (
              <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <Package className="w-5 h-5" />
                  Bundle Savings: ${(bundleSavings / 100).toFixed(2)}
                </div>
                <p className="text-sm text-[var(--success)]/70 mt-1">
                  Save {componentTotal > 0 ? Math.round((bundleSavings / componentTotal) * 100) : 0}% compared to buying separately
                </p>
              </div>
            )}

            {/* Variant Selection */}
            {product?.variants && product.variants.length > 1 && (
              <div>
                <h3 className="font-semibold mb-3">Variant:</h3>
                <div className="flex flex-wrap gap-2">
                  {product?.variants?.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`px-4 py-2 rounded border text-sm font-medium ${
                        selectedVariantId === variant.id
                          ? 'border-black bg-black text-white'
                          : 'border-gray-300 bg-white text-black hover:border-gray-400'
                      }`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Bundle Components - Show before Add to Cart */}
            {isBundle && bundle?.items && bundle.items.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">What's Included in This Bundle</h3>
                <div className="space-y-3">
                  {[...bundle.items]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((item) => {
                      // Use priceWithTax for consistency with regular products (already in cents)
                      const itemTotal = item.productVariant.priceWithTax * item.quantity;
                      return (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                          <div className="w-14 h-14 bg-gray-50 rounded flex items-center justify-center flex-shrink-0">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{item.productVariant.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">SKU: {item.productVariant.sku}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium">${(itemTotal / 100).toFixed(2)}</div>
                            <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                          </div>
                        </div>
                      );
                    })}
                </div>
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
                    {isInStock ? 'ADD TO CART' : 'OUT OF STOCK'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  <Heart className="w-4 h-4" />
                  <span className="text-sm">Add to Wishlist</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-b">
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-xs text-gray-600">Free Shipping</div>
                <div className="text-xs text-gray-500">Orders over $50</div>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-xs text-gray-600">Quality Guarantee</div>
                <div className="text-xs text-gray-500">100% authentic</div>
              </div>
              <div className="text-center">
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <div className="text-xs text-gray-600">Easy Returns</div>
                <div className="text-xs text-gray-500">30 day returns</div>
              </div>
            </div>

            {/* Description */}
            {product?.description && (
              <div>
                <h3 className="font-semibold mb-3">Description</h3>
                <div className="text-gray-700 leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                </div>
              </div>
            )}
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

        {/* Related Products - automatically shows featured or collection-based products */}
        {!isBundle && product && (
          <div className="mt-16">
            <RelatedProducts 
              currentProductId={product.id}
              collections={product.collections}
            />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
