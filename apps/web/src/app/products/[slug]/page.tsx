'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT_BY_SLUG } from '@/lib/graphql/queries';
import { Star, Heart, Share2, Truck, Shield, RotateCcw, Plus, Minus, Search, User, ArrowLeft, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductReviews } from '@/components/ProductReviews';
import { RelatedProducts } from '@/components/RelatedProducts';
import { useCart } from '@/lib/hooks/useCart';
import MiniCart from '@/components/MiniCart';

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

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { addItem, openCart } = useCart();

  const { data, loading, error } = useQuery<{ product: Product }>(GET_PRODUCT_BY_SLUG, {
    variables: { slug },
    skip: !slug,
  });

  const product = data?.product;
  const selectedVariant = product?.variants.find(v => v.id === selectedVariantId) || product?.variants[0];

  // Set default variant when product loads
  if (product && !selectedVariantId && product.variants.length > 0) {
    setSelectedVariantId(product.variants[0].id);
  }

  const images = [
    product?.featuredAsset?.preview,
    ...(product?.variants.map(v => v.featuredAsset?.preview).filter(Boolean) || [])
  ].filter(Boolean) as string[];

  const handleQuantityChange = (delta: number) => {
    setQuantity(Math.max(1, quantity + delta));
  };

  const handleAddToCart = () => {
    if (!selectedVariant || !product) return;
    
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
    
    // Open cart drawer to show the added item
    openCart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-black text-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <Link href="/" className="flex items-center">
                <img src="/impactlogo.webp" alt="Impact Nutrition" className="h-8" />
              </Link>
              <div className="flex items-center gap-6 text-xs">
                <Link href="/products" className="hover:text-gray-300">Products</Link>
                <MiniCart />
              </div>
            </div>
          </div>
        </header>
        
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

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-black text-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-3">
              <Link href="/" className="flex items-center">
                <img src="/impactlogo.webp" alt="Impact Nutrition" className="h-8" />
              </Link>
              <div className="flex items-center gap-6 text-xs">
                <Link href="/products" className="hover:text-gray-300">Products</Link>
                <MiniCart />
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <Link 
            href="/products"
            className="bg-black text-white px-6 py-3 font-medium hover:bg-gray-800"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const isInStock = selectedVariant?.stockLevel !== 'OUT_OF_STOCK';
  const price = selectedVariant?.priceWithTax || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <img src="/impactlogo.webp" alt="Impact Nutrition" className="h-8" />
            </Link>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Search" 
                  className="w-full bg-white text-black px-4 py-2 pr-10 text-sm"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              </div>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-6 text-xs">
              <a href="#" className="hover:text-gray-300">Help & Support</a>
              <User className="w-5 h-5 cursor-pointer" />
              <MiniCart />
            </div>
          </div>
          
          {/* Main Navigation */}
          <nav className="border-t border-gray-800">
            <ul className="flex items-center justify-center gap-8 py-3 text-xs font-medium">
              <li><Link href="/products" className="hover:text-gray-300">SHOP BY PRODUCT</Link></li>
              <li><a href="/#goals-section" className="hover:text-gray-300">SHOP BY GOALS</a></li>
              <li><a href="#" className="hover:text-gray-300">BUNDLES</a></li>
              <li><a href="#" className="hover:text-gray-300">ATHLETES</a></li>
              <li><a href="#" className="text-red-500 hover:text-red-400">SPECIAL DEALS</a></li>
            </ul>
          </nav>
        </div>
      </header>

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
                <span className="text-black font-medium">{product.name}</span>
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
                  alt={product.name}
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
                      alt={`${product.name} ${index + 1}`}
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
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
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

            {/* Variant Selection */}
            {product.variants.length > 1 && (
              <div>
                <h3 className="font-semibold mb-3">Variant:</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
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
            {product.description && (
              <div>
                <h3 className="font-semibold mb-3">Description</h3>
                <div 
                  className="text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Product Reviews */}
        <div className="mt-16">
          <ProductReviews 
            productId={product.id}
            averageRating={4.3}
            totalReviews={127}
          />
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts currentProductId={product.id} />
        </div>
      </div>
    </div>
  );
}
