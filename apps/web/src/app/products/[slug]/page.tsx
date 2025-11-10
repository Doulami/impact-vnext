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
  variants: ProductVariant[];
}

interface Bundle {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  enabled: boolean;
  items: Array<{
    id: string;
    productVariant: {
      id: string;
      name: string;
      sku: string;
      price: number;
      product: {
        id: string;
        name: string;
        slug: string;
      };
    };
    quantity: number;
    unitPrice: number;
    displayOrder: number;
  }>;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addItem, openCart } = useCart();

  // Determine if this is a bundle or regular product based on slug
  const isBundle = slug?.startsWith('bundle-');

  // Query for regular products
  const { data: productData, loading: productLoading, error: productError } = useQuery<{ product: Product }>(
    GET_PRODUCT_BY_SLUG,
    {
      variables: { slug },
      skip: !slug || isBundle,
    }
  );

  // Query for bundles
  const { data: bundleData, loading: bundleLoading, error: bundleError } = useQuery<{ bundle: Bundle }>(
    GET_BUNDLE,
    {
      variables: { id: slug?.replace('bundle-', '') },
      skip: !slug || !isBundle,
    }
  );

  const loading = isBundle ? bundleLoading : productLoading;
  const error = isBundle ? bundleError : productError;
  const product = productData?.product;
  const bundle = bundleData?.bundle;
  const selectedVariant = product?.variants.find(v => v.id === selectedVariantId) || product?.variants[0];

  // Set default variant when product loads
  if (product && !selectedVariantId && product.variants.length > 0) {
    setSelectedVariantId(product.variants[0].id);
  }

  // Helper function for bundle mock images
  const getMockBundleImage = (name: string) => {
    if (name.toLowerCase().includes('performance')) return '/products/bundle-performance.jpg';
    if (name.toLowerCase().includes('muscle')) return '/products/bundle-muscle.jpg';
    if (name.toLowerCase().includes('lean')) return '/products/bundle-lean.jpg';
    if (name.toLowerCase().includes('strength')) return '/products/bundle-strength.jpg';
    return '/product-placeholder.svg';
  };

  const images = isBundle && bundle
    ? [getMockBundleImage(bundle.name)]
    : [
        product?.featuredAsset?.preview,
        ...(product?.variants.map(v => v.featuredAsset?.preview).filter(Boolean) || [])
      ].filter(Boolean) as string[];

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAddToCart = () => {
    if (isBundle && bundle) {
      // Add bundle as single item with components metadata
      const originalPrice = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
      const bundleSavings = originalPrice - bundle.price;
      
      addItem({
        id: bundle.id,
        variantId: `bundle-${bundle.id}`,
        productName: bundle.name,
        variantName: undefined,
        price: bundle.price * 100, // Convert to cents
        originalPrice: originalPrice * 100, // For displaying savings
        image: getMockBundleImage(bundle.name),
        slug: `bundle-${bundle.slug || bundle.id}`,
        inStock: true,
        quantity: quantity,
        isBundle: true,
        bundleId: bundle.id,
        bundleComponents: bundle.items
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

  const currentItem = isBundle ? bundle : product;
  const isInStock = isBundle ? true : selectedVariant?.stockLevel !== 'OUT_OF_STOCK';
  const price = isBundle 
    ? (bundle?.price || 0) * 100 // Convert to cents for consistency
    : selectedVariant?.priceWithTax || 0;
  
  // Calculate bundle savings
  const bundleSavings = isBundle && bundle
    ? bundle.items.reduce((sum, item) => sum + item.unitPrice, 0) - bundle.price
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
            <div className="text-3xl font-bold">
              ${(price / 100).toFixed(2)}
              {selectedVariant?.sku && (
                <span className="text-sm text-gray-600 ml-2">SKU: {selectedVariant.sku}</span>
              )}
            </div>
            
            {/* Bundle Savings */}
            {isBundle && bundleSavings > 0 && (
              <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold">
                  <Package className="w-5 h-5" />
                  Bundle Savings: ${bundleSavings.toFixed(2)}
                </div>
                <p className="text-sm text-[var(--success)]/70 mt-1">
                  Save {Math.round((bundleSavings / (bundleSavings + (bundle?.price || 0))) * 100)}% compared to buying separately
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
            {isBundle && bundle?.items && (
              <div>
                <h3 className="font-semibold mb-3">What's Included</h3>
                <div className="space-y-3">
                  {[...bundle.items]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        <img
                          src="/product-placeholder.svg"
                          alt={item.productVariant.name}
                          className="w-8 h-8 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.productVariant.name}</h4>
                        <p className="text-xs text-gray-600">SKU: {item.productVariant.sku}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">${item.unitPrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-600">Qty: {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span>Individual Total:</span>
                    <span className="font-semibold">${bundle.items.reduce((sum, item) => sum + item.unitPrice, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-[var(--success)]">
                    <span>Bundle Price:</span>
                    <span className="font-bold">${bundle.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-[var(--success)] border-t pt-2 mt-2">
                    <span>You Save:</span>
                    <span>${bundleSavings.toFixed(2)}</span>
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
            {((isBundle && bundle?.description) || (!isBundle && product?.description)) && (
              <div>
                <h3 className="font-semibold mb-3">Description</h3>
                <div className="text-gray-700 leading-relaxed">
                  {isBundle ? bundle?.description : (
                    <div dangerouslySetInnerHTML={{ __html: product?.description || '' }} />
                  )}
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

        {/* Related Products - Only for regular products */}
        {!isBundle && (
          <div className="mt-16">
            <RelatedProducts currentProductId={product?.id || ''} />
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
