'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQuery } from '@apollo/client/react';
import { GET_ORDER_FOR_CHECKOUT } from '@/lib/graphql/checkout';
import { GET_BUNDLES_SHELL_PRODUCTS } from '@/lib/graphql/bundles';
import { groupOrderLinesByBundle } from '@/lib/utils/bundleGrouping';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import BundleCard from '@/components/BundleCard';
import { CheckCircle, Package, Truck, Mail, Phone } from 'lucide-react';

function ThankYouContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('order');
  const { customer } = useAuth();

  const { data, loading, error } = useQuery(GET_ORDER_FOR_CHECKOUT, {
    variables: { code: orderCode || '' },
    skip: !orderCode
  });

  // Extract bundle IDs from order lines
  const bundleIds = Array.from(
    new Set(
      (data as any)?.orderByCode?.lines
        ?.map((l: any) => l.customFields?.bundleId)
        .filter(Boolean) || []
    )
  );

  // Fetch shell products for bundles
  const { data: shellData } = useQuery<{
    bundles: {
      items: Array<{
        id: string;
        shellProduct?: {
          id: string;
          slug: string;
        };
      }>;
    };
  }>(GET_BUNDLES_SHELL_PRODUCTS, {
    variables: { ids: bundleIds },
    skip: bundleIds.length === 0,
  });

  useEffect(() => {
    console.log('Thank you page - orderCode:', orderCode);
    console.log('Thank you page - query data:', data);
    console.log('Thank you page - query error:', error);
    console.log('Thank you page - query loading:', loading);
    
    // Google Analytics / Facebook Pixel tracking can be added here
    if (orderCode && data) {
      // Example: gtag('event', 'purchase', { transaction_id: orderCode, value: total, currency: 'USD' });
      console.log('Order completed:', orderCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode]);

  if (!orderCode) {
    router.push('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !(data as any)?.orderByCode) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find your order. Please check your email for confirmation.</p>
            <Button
              as="link"
              href="/"
              variant="primary"
            >
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const order = (data as any).orderByCode;
  
  if (!order || !order.lines) {
    console.error('Order data is incomplete:', order);
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Data Incomplete</h1>
            <p className="text-gray-600 mb-6">We're having trouble loading your order details. Please check your email for confirmation.</p>
            <Button
              as="link"
              href="/"
              variant="primary"
            >
              Back to Home
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }
  
  const totalAmount = (order.totalWithTax / 100).toFixed(2);
  // Calculate subtotal with tax (sum of all line prices with tax and discounts)
  const subtotalWithTax = order.lines.reduce((sum: number, line: any) => {
    const finalPrice = line.discountedLinePriceWithTax || line.linePriceWithTax;
    return sum + finalPrice;
  }, 0);
  const subtotal = (subtotalWithTax / 100).toFixed(2);
  const shippingCost = order.shippingLines?.[0]?.priceWithTax ? (order.shippingLines[0].priceWithTax / 100).toFixed(2) : '0.00';
  const shippingMethod = order.shippingLines?.[0]?.shippingMethod?.name || 'Standard Shipping';
  
  // Debug order lines
  console.log('[ThankYou] Raw order lines:', order.lines);
  console.log('[ThankYou] Order lines with customFields:', order.lines.map((l: any) => ({
    id: l.id,
    name: l.productVariant.name,
    customFields: l.customFields
  })));
  
  // Create map of bundleId -> shell product slug
  const shellProductSlugs = new Map<string, string>();
  if (shellData?.bundles?.items) {
    for (const bundle of shellData.bundles.items) {
      if (bundle.shellProduct?.slug) {
        shellProductSlugs.set(bundle.id, bundle.shellProduct.slug);
      }
    }
  }
  
  // Group order lines by bundle
  const groupedItems = groupOrderLinesByBundle(order.lines, shellProductSlugs);
  console.log('[ThankYou] Grouped items:', groupedItems);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="bg-gray-50 min-h-screen py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Header */}
          <div className="bg-white rounded-lg shadow-sm p-8 text-center mb-6">
            <div className="w-16 h-16 bg-[color-mix(in_srgb,var(--success)_20%,white)] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" style={{ color: 'var(--success)' }} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You for Your Order!</h1>
            <p className="text-gray-600 mb-4">Your order has been received and is being processed.</p>
            <div className="bg-gray-100 rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="text-2xl font-bold text-gray-900">{order.code}</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Order Details</h2>
            
            {/* Order Items */}
            <div className="space-y-4 mb-6">
              {groupedItems.map((item, index) => (
                <div key={`order-item-${index}-${item.variantId}`} className="pb-4 border-b last:border-b-0">
                  {item.isBundle ? (
                    <BundleCard
                      item={item}
                      showQuantityControls={false}
                      showRemoveButton={false}
                      showTotal={true}
                    />
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            🏋️
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        {item.slug ? (
                          <Link href={`/products/${item.slug}`}>
                            <h3 className="font-medium text-gray-900 hover:text-[var(--brand-primary)] transition-colors cursor-pointer">{item.productName}</h3>
                          </Link>
                        ) : (
                          <h3 className="font-medium text-gray-900">{item.productName}</h3>
                        )}
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Order Total */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">${((order.subTotalWithTax || subtotalWithTax) / 100).toFixed(2)}</span>
              </div>
              
              {/* Applied Coupons */}
              {order.couponCodes && order.couponCodes.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 flex items-center gap-2">
                    Coupons:
                    {order.couponCodes.map((code: string) => (
                      <span key={code} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                        {code}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              
              {/* Discounts */}
              {order.discounts && order.discounts.length > 0 && order.discounts.map((discount: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm text-green-600">
                  <span>{discount.description}</span>
                  <span>-${(discount.amountWithTax / 100).toFixed(2)}</span>
                </div>
              ))}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping ({shippingMethod}):</span>
                <span className="text-gray-900">${shippingCost}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${totalAmount}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Payment Method: Cash on Delivery
              </p>
            </div>
          </div>

          {/* Shipping & Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Truck className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="font-bold text-gray-900">Shipping Address</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.streetLine1}</p>
                {order.shippingAddress.streetLine2 && <p>{order.shippingAddress.streetLine2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phoneNumber && (
                  <p className="flex items-center mt-2">
                    <Phone className="w-4 h-4 mr-1" />
                    {order.shippingAddress.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <Mail className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="font-bold text-gray-900">Confirmation Sent To</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {order.customer.firstName} {order.customer.lastName}
                </p>
                <p>{order.customer.emailAddress}</p>
              </div>
              <div className="mt-4 p-3 bg-[color-mix(in_srgb,var(--brand-primary)_10%,white)] rounded-lg">
                <p className="text-xs" style={{ color: 'var(--brand-primary)' }}>
                  📧 A confirmation email has been sent with your order details and tracking information.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">What Happens Next?</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-[var(--brand-primary)] text-white rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Order Processing</p>
                  <p className="text-sm text-gray-600">We'll prepare your order for shipment within 1-2 business days.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-[var(--brand-primary)] text-white rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Shipment & Tracking</p>
                  <p className="text-sm text-gray-600">You'll receive tracking information via email once your order ships.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="w-8 h-8 bg-[var(--brand-primary)] text-white rounded-full flex items-center justify-center flex-shrink-0 mr-3">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Delivery & Payment</p>
                  <p className="text-sm text-gray-600">Pay ${totalAmount} in cash when your order arrives at your doorstep.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              as="link"
              href="/account/orders"
              variant="primary"
              size="lg"
            >
              <span className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                View All Orders
              </span>
            </Button>
            <Button
              as="link"
              href="/products"
              variant="secondary"
              size="lg"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
        </div>
        <Footer />
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
