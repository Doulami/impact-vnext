'use client';

import { useQuery } from '@apollo/client/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { GET_BUNDLES } from '@/lib/graphql/queries';
import { useCart } from '@/lib/hooks/useCart';
import Button from '@/components/Button';
import { Package, Star, Users, Zap } from 'lucide-react';
import Link from 'next/link';

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

// Unified bundle card type following product card pattern
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

// Helper function to convert Bundle to BundleCard (following product pattern)
function toBundleCardData(bundle: Bundle): BundleCard {
  const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
  const savings = componentTotal - bundle.price;
  const savingsPercentage = componentTotal > 0 ? Math.round((savings / componentTotal) * 100) : 0;
  
  // Mock image based on bundle name
  const getMockImage = (name: string) => {
    if (name.toLowerCase().includes('performance')) return '/products/bundle-performance.jpg';
    if (name.toLowerCase().includes('muscle')) return '/products/bundle-muscle.jpg';
    if (name.toLowerCase().includes('lean')) return '/products/bundle-lean.jpg';
    if (name.toLowerCase().includes('strength')) return '/products/bundle-strength.jpg';
    return '/products/bundle-default.jpg';
  };
  
  return {
    id: bundle.id,
    name: bundle.name,
    slug: bundle.slug || `bundle-${bundle.id}`,
    image: getMockImage(bundle.name),
    price: bundle.price,
    originalPrice: componentTotal,
    savings,
    savingsPercentage,
    itemCount: bundle.items.length,
    inStock: true, // Bundles are typically always available
    rating: 4.5, // Mock rating
    reviews: 127, // Mock reviews
    description: bundle.description
  };
}

function BundleCard({ bundleCard }: { bundleCard: BundleCard }) {
  const { addItem, openCart } = useCart();

  return (
    <Link
      href={`/products/${bundleCard.slug}`}
      className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
    >
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {bundleCard.image ? (
          <img
            src={bundleCard.image}
            alt={bundleCard.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
          <div className="absolute top-2 right-2 bg-[var(--danger)] text-white px-2 py-1 rounded text-xs font-bold">
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
      
      <div className="p-3">
        <h3 className="font-semibold text-xs mb-1 line-clamp-2 group-hover:text-[var(--brand-primary)]">
          {bundleCard.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`w-2.5 h-2.5 ${
                i < Math.floor(bundleCard.rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
          <span className="text-[10px] text-gray-500 ml-0.5">
            ({bundleCard.reviews})
          </span>
        </div>
        <div className="space-y-2">
          {/* Price */}
          <div className="text-center">
            <div className="text-sm font-bold">
              ${(bundleCard.price / 100).toFixed(2)}
            </div>
            {bundleCard.savings > 0 && (
              <div className="text-xs text-[var(--success)] font-medium">
                Save ${(bundleCard.savings / 100).toFixed(2)}
              </div>
            )}
          </div>
          
          {/* Action Button - Unified with products */}
          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = `/products/${bundleCard.slug}`;
            }}
            className="w-full bg-[var(--brand-secondary)] text-white py-2 text-xs font-medium hover:bg-[var(--brand-secondary)]/90 transition-colors uppercase tracking-wide"
          >
            VIEW BUNDLE
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function BundlesPage() {
  const { data, loading, error } = useQuery(GET_BUNDLES, {
    variables: {
      options: {
        filter: { enabled: { eq: true } },
        take: 20
      }
    },
    errorPolicy: 'all'
  });

  // Mock bundles for when backend isn't ready
  const mockBundles: Bundle[] = [
    {
      id: 'mock-performance-stack',
      name: 'Performance Stack',
      description: 'Complete pre and post-workout nutrition for peak performance',
      price: 89.97,
      enabled: true,
      items: [
        {
          id: 'item-1',
          productVariant: {
            id: 'whey-protein-2kg',
            name: 'Whey Protein 2kg Vanilla',
            sku: 'WP-2KG-VAN',
            price: 39.99,
            product: { id: 'whey-protein', name: 'Whey Protein Isolate', slug: 'whey-protein' }
          },
          quantity: 1,
          unitPrice: 39.99,
          displayOrder: 1
        },
        {
          id: 'item-2',
          productVariant: {
            id: 'creatine-300g',
            name: 'Creatine Monohydrate 300g',
            sku: 'CREA-300G',
            price: 29.99,
            product: { id: 'creatine', name: 'Creatine Monohydrate', slug: 'creatine' }
          },
          quantity: 1,
          unitPrice: 29.99,
          displayOrder: 2
        },
        {
          id: 'item-3',
          productVariant: {
            id: 'bcaa-400g',
            name: 'BCAA Complex 400g Fruit Punch',
            sku: 'BCAA-400G-FP',
            price: 24.99,
            product: { id: 'bcaa', name: 'BCAA Complex', slug: 'bcaa' }
          },
          quantity: 1,
          unitPrice: 24.99,
          displayOrder: 3
        }
      ]
    },
    {
      id: 'mock-lean-muscle',
      name: 'Lean Muscle Builder',
      description: 'Optimized stack for lean muscle growth and recovery',
      price: 79.97,
      enabled: true,
      items: [
        {
          id: 'item-4',
          productVariant: {
            id: 'whey-concentrate-2kg',
            name: 'Whey Protein Concentrate 2kg Chocolate',
            sku: 'WPC-2KG-CHOC',
            price: 34.99,
            product: { id: 'whey-concentrate', name: 'Whey Protein Concentrate', slug: 'whey-concentrate' }
          },
          quantity: 1,
          unitPrice: 34.99,
          displayOrder: 1
        },
        {
          id: 'item-5',
          productVariant: {
            id: 'glutamine-500g',
            name: 'L-Glutamine 500g Unflavored',
            sku: 'GLUT-500G',
            price: 24.99,
            product: { id: 'glutamine', name: 'L-Glutamine', slug: 'glutamine' }
          },
          quantity: 1,
          unitPrice: 24.99,
          displayOrder: 2
        },
        {
          id: 'item-6',
          productVariant: {
            id: 'multivitamin-90caps',
            name: 'Sports Multivitamin 90 Capsules',
            sku: 'MULTI-90CAPS',
            price: 19.99,
            product: { id: 'multivitamin', name: 'Sports Multivitamin', slug: 'multivitamin' }
          },
          quantity: 1,
          unitPrice: 19.99,
          displayOrder: 3
        }
      ]
    },
    {
      id: 'mock-strength-power',
      name: 'Strength & Power Stack',
      description: 'Maximum strength and explosive power for serious athletes',
      price: 109.97,
      enabled: true,
      items: [
        {
          id: 'item-7',
          productVariant: {
            id: 'casein-2kg',
            name: 'Micellar Casein 2kg Vanilla',
            sku: 'CAS-2KG-VAN',
            price: 49.99,
            product: { id: 'casein', name: 'Micellar Casein', slug: 'casein' }
          },
          quantity: 1,
          unitPrice: 49.99,
          displayOrder: 1
        },
        {
          id: 'item-8',
          productVariant: {
            id: 'pre-workout-300g',
            name: 'Pre-Workout 300g Berry Blast',
            sku: 'PWO-300G-BB',
            price: 34.99,
            product: { id: 'pre-workout', name: 'Pre-Workout', slug: 'pre-workout' }
          },
          quantity: 1,
          unitPrice: 34.99,
          displayOrder: 2
        },
        {
          id: 'item-9',
          productVariant: {
            id: 'hmb-120caps',
            name: 'HMB 120 Capsules',
            sku: 'HMB-120CAPS',
            price: 24.99,
            product: { id: 'hmb', name: 'HMB', slug: 'hmb' }
          },
          quantity: 1,
          unitPrice: 24.99,
          displayOrder: 3
        }
      ]
    }
  ];

  const bundles = (data as any)?.bundles?.items?.filter((bundle: Bundle) => bundle.enabled) || mockBundles;
  const bundleCards = bundles.map(toBundleCardData);

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
        {error && !bundleCards.length && (
          <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-lg p-6 text-center">
            <p className="text-[var(--warning)] mb-2">
              Unable to load bundles from the server. Showing sample bundles instead.
            </p>
            <p className="text-[var(--warning)]/70 text-sm">
              {error.message}
            </p>
          </div>
        )}

        {/* Bundles Grid - Following product grid pattern */}
        {!loading && bundleCards.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {bundleCards.map((bundleCard: BundleCard) => (
              <BundleCard key={bundleCard.id} bundleCard={bundleCard} />
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