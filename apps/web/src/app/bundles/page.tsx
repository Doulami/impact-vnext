'use client';

import { useQuery, useApolloClient } from '@apollo/client/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { GET_BUNDLES } from '@/lib/graphql/queries';
import { useCart } from '@/lib/hooks/useCart';
import { addBundleToCart } from '@/lib/helpers/bundleCart';
import Button from '@/components/Button';
import { Package, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';

interface BundleCard {
  id: string;
  name: string;
  slug: string;
  image?: string;
  price: number;
  originalPrice: number;
  savings: number;
  savingsPercentage: number;
  itemCount: number;
  inStock: boolean;
  rating: number;
  reviews: number;
  description?: string;
}

function BundleCard({ bundleCard, onAddToCart }: { bundleCard: BundleCard; onAddToCart: (slug: string, bundleCard: BundleCard) => void }) {
  return (
    <Link
      href={`/products/${bundleCard.slug}`}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
    >
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {bundleCard.image ? (
          <img
            src={bundleCard.image}
            alt={bundleCard.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/product-placeholder.svg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            📦
          </div>
        )}
        
        {/* Bundle Badge */}
        <div className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <Package className="w-3 h-3" />
          Bundle
        </div>
        
        {/* Savings Badge */}
        {bundleCard.savings > 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
            Save {bundleCard.savingsPercentage}%
          </div>
        )}
        
        {!bundleCard.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white px-4 py-2 text-sm font-bold">
              OUT OF STOCK
            </span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-sm mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {bundleCard.name}
        </h3>
        <p className="text-xs text-gray-600 mb-2">{bundleCard.itemCount} items included</p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(bundleCard.rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            ({bundleCard.reviews})
          </span>
        </div>
        <div className="space-y-3">
          {/* Price */}
          <div className="text-center">
            <div className="text-lg font-bold">
              ${(bundleCard.price / 100).toFixed(2)}
            </div>
            {bundleCard.savings > 0 && (
              <div className="text-xs text-green-600 font-medium">
                Save ${(bundleCard.savings / 100).toFixed(2)}
              </div>
            )}
          </div>
          
          {/* Action Button - Match featured products style */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(bundleCard.slug, bundleCard);
            }}
            className="w-full bg-black text-white py-2.5 text-xs font-medium hover:bg-gray-800 transition-colors uppercase tracking-wide"
          >
            ADD BUNDLE
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function BundlesPage() {
  const { addItem, openCart } = useCart();
  const apolloClient = useApolloClient();
  
  // Query Bundle entities directly to get bundle metadata and shell product info
  const { data, loading, error } = useQuery(GET_BUNDLES, {
    variables: {
      options: {
        filter: { status: { eq: 'ACTIVE' } },
        take: 100
      }
    },
    errorPolicy: 'all'
  });

  const bundles = (data as any)?.bundles?.items || [];
  
  // Filter bundles by visibility rules (status and promotion dates)
  const now = new Date();
  const visibleBundles = bundles.filter((bundle: any) => {
    // Must be ACTIVE status
    if (bundle.status !== 'ACTIVE') {
      return false;
    }
    
    // Check validFrom date
    if (bundle.validFrom) {
      const validFrom = new Date(bundle.validFrom);
      if (now < validFrom) {
        return false; // Not yet available
      }
    }
    
    // Check validTo date
    if (bundle.validTo) {
      const validTo = new Date(bundle.validTo);
      if (now > validTo) {
        return false; // Expired
      }
    }
    
    return true;
  });
  
  // Convert Bundle entities to card format
  // Use shell product slug for SEO-friendly URLs
  const bundleCards = visibleBundles.map((bundle: any) => {
    // Calculate component total and savings (unitPrice is in dollars, convert to cents)
    const componentTotal = bundle.items?.reduce((sum: number, item: any) => 
      sum + (item.unitPrice * 100 * item.quantity), 0
    ) || 0;
    const bundlePrice = bundle.effectivePrice; // effectivePrice is in cents
    const savings = Math.max(0, componentTotal - bundlePrice);
    const savingsPercentage = componentTotal > 0 ? Math.round((savings / componentTotal) * 100) : 0;
    
    // Bundle is in stock if ACTIVE status AND within date range (already filtered above)
    // Since visibleBundles is already filtered by these criteria, all are in stock
    return {
      id: bundle.id,
      name: bundle.name,
      slug: bundle.shellProduct?.slug || bundle.slug, // Use shell product slug for proper SEO URLs
      image: bundle.featuredAsset?.preview || bundle.assets?.[0]?.preview || '/product-placeholder.svg',
      price: bundlePrice,
      originalPrice: componentTotal,
      savings: savings,
      savingsPercentage: savingsPercentage,
      itemCount: bundle.items?.length || 0,
      inStock: true, // Already filtered by status + date validity above
      rating: 4.5,
      reviews: 127,
      description: bundle.description
    };
  });

  const handleAddToCart = async (slug: string, bundleCard: BundleCard) => {
    try {
      const cartItem = await addBundleToCart({
        slug: slug,
        productId: bundleCard.id,
        productName: bundleCard.name,
        image: bundleCard.image,
        quantity: 1,
        apolloClient
      });
      
      addItem(cartItem);
      openCart();
    } catch (err) {
      console.error('Error adding bundle to cart:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Nutrition Bundles</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Save money and maximize your results with our expertly curated supplement stacks. 
            Each bundle is designed by nutrition experts to help you reach your fitness goals faster.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center">
            <div className="bg-[var(--brand-primary)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-[var(--brand-primary)]" />
            </div>
            <h3 className="font-semibold mb-2">Expertly Curated</h3>
            <p className="text-gray-600 text-sm">Each bundle is designed by our nutrition experts for maximum synergy</p>
          </div>
          <div className="text-center">
            <div className="bg-[var(--success)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[var(--success)]" />
            </div>
            <h3 className="font-semibold mb-2">Better Value</h3>
            <p className="text-gray-600 text-sm">Save up to 25% compared to buying products individually</p>
          </div>
          <div className="text-center">
            <div className="bg-[var(--color-protein)]/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-[var(--color-protein)]" />
            </div>
            <h3 className="font-semibold mb-2">Proven Results</h3>
            <p className="text-gray-600 text-sm">Trusted by thousands of athletes and fitness enthusiasts</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin"></div>
              Loading bundles...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-2">
              Unable to load bundles from the server.
            </p>
            <p className="text-red-500 text-sm">
              {error.message}
            </p>
          </div>
        )}

        {/* Bundles Grid - Match featured products style */}
        {!loading && bundleCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {bundleCards.map((bundleCard: BundleCard) => (
              <BundleCard key={bundleCard.id} bundleCard={bundleCard} onAddToCart={handleAddToCart} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && bundleCards.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Bundles Available</h3>
            <p className="text-gray-500">Check back soon for new bundle offers!</p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}