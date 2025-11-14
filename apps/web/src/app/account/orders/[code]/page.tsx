'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQuery } from '@apollo/client/react';
import { GET_ORDER_FOR_CHECKOUT } from '@/lib/graphql/checkout';
import { groupOrderLinesByBundle } from '@/lib/utils/bundleGrouping';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import BundleCard from '@/components/BundleCard';
import { ArrowLeft, Package, Truck, Mail, Phone, Calendar, MapPin, CreditCard, CheckCircle, Clock, Box } from 'lucide-react';

export default function OrderDetailsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderCode = params.code as string;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/orders');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data, loading, error } = useQuery(GET_ORDER_FOR_CHECKOUT, {
    variables: { code: orderCode },
    skip: !isAuthenticated || !orderCode,
    fetchPolicy: 'network-only',
  });

  if (authLoading || loading) {
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

  if (!isAuthenticated) {
    return null;
  }

  if (error || !(data as any)?.orderByCode) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="bg-gray-50 min-h-screen py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h1>
              <p className="text-gray-600 mb-6">We couldn't find this order. Please check your order number.</p>
              <Button as="link" href="/account/orders" variant="primary">
                Back to Orders
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const order = (data as any).orderByCode;
  const totalAmount = (order.totalWithTax / 100).toFixed(2);
  
  // Group order lines by bundle
  const groupedItems = groupOrderLinesByBundle(order.lines);

  const getStatusInfo = (state: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      'ArrangingPayment': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Arranging Payment' },
      'PaymentAuthorized': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: 'Payment Authorized' },
      'PaymentSettled': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Payment Settled' },
      'PartiallyShipped': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck, label: 'Partially Shipped' },
      'Shipped': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck, label: 'Shipped' },
      'Delivered': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: 'Delivered' },
      'Cancelled': { color: 'bg-red-100 text-red-800 border-red-200', icon: Package, label: 'Cancelled' },
    };
    // Add spaces to camelCase state names if not in statusMap
    const formattedLabel = state.replace(/([A-Z])/g, ' $1').trim();
    return statusMap[state] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Package, label: formattedLabel };
  };

  const statusInfo = getStatusInfo(order.state);
  const StatusIcon = statusInfo.icon;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pending';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Pending';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/account/orders" 
              className="inline-flex items-center text-[var(--brand-primary)] hover:underline mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order #{order.code}</h1>
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Placed on {formatDate(order.orderPlacedAt || order.updatedAt)}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg border-2 ${statusInfo.color} flex items-center gap-2 self-start md:self-center`}>
                <StatusIcon className="h-5 w-5" />
                <span className="font-semibold">{statusInfo.label}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Order Items
                </h2>
                <div className="space-y-4">
                  {groupedItems.map((item) => (
                    <div key={item.variantId} className="pb-4 border-b last:border-b-0">
                      {item.isBundle ? (
                        <BundleCard
                          item={item}
                          showQuantityControls={false}
                          showRemoveButton={false}
                          showTotal={true}
                        />
                      ) : (
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
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
                                <h3 className="font-semibold text-gray-900 mb-1 hover:text-[var(--brand-primary)] transition-colors cursor-pointer">{item.productName}</h3>
                              </Link>
                            ) : (
                              <h3 className="font-semibold text-gray-900 mb-1">{item.productName}</h3>
                            )}
                            <p className="text-sm text-gray-600 mb-2">SKU: {item.variantName}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Quantity: {item.quantity}</span>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                                <p className="text-xs text-gray-500">${(item.price / 100).toFixed(2)} each</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${(order.total / 100).toFixed(2)}</span>
                  </div>
                  {order.shippingLines && order.shippingLines.length > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping:</span>
                      <span>${(order.shippingLines[0].priceWithTax / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>Tax:</span>
                    <span>${((order.totalWithTax - order.total) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                    <span>Total:</span>
                    <span>${totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Timeline</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Order Placed</p>
                      <p className="text-sm text-gray-600">{formatDate(order.orderPlacedAt || order.updatedAt || order.createdAt)}</p>
                      <p className="text-sm text-gray-500 mt-1">Your order has been received and is being processed.</p>
                    </div>
                  </div>

                  {order.state === 'PaymentSettled' && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Payment Confirmed</p>
                        <p className="text-sm text-gray-600">Payment has been settled</p>
                      </div>
                    </div>
                  )}

                  {(order.state === 'Shipped' || order.state === 'PartiallyShipped' || order.state === 'Delivered') && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Shipped</p>
                        <p className="text-sm text-gray-600">Your order is on its way!</p>
                      </div>
                    </div>
                  )}

                  {order.state === 'Delivered' && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Delivered</p>
                        <p className="text-sm text-gray-600">Your order has been delivered successfully!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-semibold text-gray-900">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.streetLine1}</p>
                  {order.shippingAddress.streetLine2 && <p>{order.shippingAddress.streetLine2}</p>}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}</p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phoneNumber && (
                    <p className="flex items-center gap-1 mt-2 pt-2 border-t">
                      <Phone className="h-4 w-4" />
                      {order.shippingAddress.phoneNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Customer Information
                </h2>
                <div className="text-sm text-gray-600 space-y-2">
                  <div>
                    <p className="font-semibold text-gray-900">{order.customer.firstName} {order.customer.lastName}</p>
                    <p className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {order.customer.emailAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Method
                </h2>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">Cash on Delivery</p>
                  <p className="text-gray-600 mt-1">Pay ${totalAmount} when your order is delivered</p>
                </div>
              </div>

              {/* Shipping Method */}
              {order.shippingLines && order.shippingLines.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping Method
                  </h2>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{order.shippingLines[0].shippingMethod.name}</p>
                    {order.shippingLines[0].shippingMethod.description && (
                      <p className="text-gray-600 mt-1">{order.shippingLines[0].shippingMethod.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <Button as="link" href="/account/orders" variant="secondary" fullWidth>
                  Back to All Orders
                </Button>
                <Button as="link" href="/products" variant="outline" fullWidth>
                  Continue Shopping
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
