'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQuery } from '@apollo/client/react';
import { GET_ORDER_FOR_CHECKOUT } from '@/lib/graphql/checkout';
import { GET_BUNDLES_SHELL_PRODUCTS } from '@/lib/graphql/bundles';
import { groupOrderLinesByBundle } from '@/lib/utils/bundleGrouping';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import BundleCard from '@/components/BundleCard';
import { ArrowLeft, Package, Truck, Mail, Phone, Calendar, MapPin, CreditCard, CheckCircle, Clock, Box } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/utils/locale-formatting';

export default function OrderDetailsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const orderCode = params.code as string;
  const t = useTranslations('orderDetails');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/login?redirect=/${locale}/account/orders`);
    }
  }, [isAuthenticated, authLoading, router]);

  const { data, loading, error } = useQuery(GET_ORDER_FOR_CHECKOUT, {
    variables: { code: orderCode },
    skip: !isAuthenticated || !orderCode,
    fetchPolicy: 'network-only',
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('orderNotFound')}</h1>
              <p className="text-gray-600 mb-6">{t('orderNotFoundDesc')}</p>
              <Button as="link" href={`/${locale}/account/orders`} variant="primary">
                {t('backToOrders')}
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
  
  // Debug order lines
  console.log('[OrderDetails] Raw order lines:', order.lines);
  console.log('[OrderDetails] Order lines with customFields:', order.lines.map((l: any) => ({
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
  console.log('[OrderDetails] Shell data:', shellData);
  console.log('[OrderDetails] Shell product slugs map:', Array.from(shellProductSlugs.entries()));
  
  // Group order lines by bundle
  const groupedItems = groupOrderLinesByBundle(order.lines, shellProductSlugs);
  console.log('[OrderDetails] Grouped items:', groupedItems);

  const getStatusInfo = (state: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      'ArrangingPayment': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: t('statusArrangingPayment') },
      'PaymentAuthorized': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, label: t('statusPaymentAuthorized') },
      'PaymentSettled': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: t('statusPaymentSettled') },
      'PartiallyShipped': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck, label: t('statusPartiallyShipped') },
      'Shipped': { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck, label: t('statusShipped') },
      'Delivered': { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, label: t('statusDelivered') },
      'Cancelled': { color: 'bg-red-100 text-red-800 border-red-200', icon: Package, label: t('statusCancelled') },
    };
    // Add spaces to camelCase state names if not in statusMap
    const formattedLabel = state.replace(/([A-Z])/g, ' $1').trim();
    return statusMap[state] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Package, label: formattedLabel };
  };

  const statusInfo = getStatusInfo(order.state);
  const StatusIcon = statusInfo.icon;

  const formatOrderDate = (dateString: string | null) => {
    if (!dateString) return t('pending');
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return t('pending');
    return formatDate(date, locale);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="bg-gray-50 min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href={`/${locale}/account/orders`}
              className="inline-flex items-center text-[var(--brand-primary)] hover:underline mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('backToOrders')}
            </Link>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('orderTitle')} #{order.code}</h1>
                <p className="text-gray-600 mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t('placedOn')} {formatOrderDate(order.orderPlacedAt || order.updatedAt)}
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
                  {t('orderItems')}
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
                              <Link href={`/${locale}/products/${item.slug}`}>
                                <h3 className="font-semibold text-gray-900 mb-1 hover:text-[var(--brand-primary)] transition-colors cursor-pointer">{item.productName}</h3>
                              </Link>
                            ) : (
                              <h3 className="font-semibold text-gray-900 mb-1">{item.productName}</h3>
                            )}
                            <p className="text-sm text-gray-600 mb-2">{t('sku')}: {item.variantName}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{t('quantity')}: {item.quantity}</span>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">{formatCurrency(((item.price * item.quantity) / 100), locale)}</p>
                                <p className="text-xs text-gray-500">{formatCurrency((item.price / 100), locale)} {t('each')}</p>
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
                    <span>{t('subtotal')}:</span>
                    <span>{formatCurrency((order.lines.reduce((sum: number, line: any) => sum + (line.discountedLinePriceWithTax || line.linePriceWithTax), 0) / 100), locale)}</span>
                  </div>
                  {order.shippingLines && order.shippingLines.length > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>{t('shipping')}:</span>
                      <span>{formatCurrency((order.shippingLines[0].priceWithTax / 100), locale)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                    <span>{t('total')}:</span>
                    <span>{formatCurrency(Number(totalAmount), locale)}</span>
                  </div>
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('orderTimeline')}</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{t('timelineOrderPlaced')}</p>
                      <p className="text-sm text-gray-600">{formatOrderDate(order.orderPlacedAt || order.updatedAt || order.createdAt)}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('timelineOrderPlacedDesc')}</p>
                    </div>
                  </div>

                  {order.state === 'PaymentSettled' && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{t('timelinePaymentConfirmed')}</p>
                        <p className="text-sm text-gray-600">{t('timelinePaymentConfirmedDesc')}</p>
                      </div>
                    </div>
                  )}

                  {(order.state === 'Shipped' || order.state === 'PartiallyShipped' || order.state === 'Delivered') && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{t('timelineShipped')}</p>
                        <p className="text-sm text-gray-600">{t('timelineShippedDesc')}</p>
                      </div>
                    </div>
                  )}

                  {order.state === 'Delivered' && (
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--success)] text-white flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{t('timelineDelivered')}</p>
                        <p className="text-sm text-gray-600">{t('timelineDeliveredDesc')}</p>
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
                  {t('shippingAddress')}
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
                  {t('customerInfo')}
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
                  {t('paymentMethod')}
                </h2>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{t('codPayment')}</p>
                  <p className="text-gray-600 mt-1">{t('codPaymentDesc').replace('{amount}', formatCurrency(Number(totalAmount), locale))}</p>
                </div>
              </div>

              {/* Shipping Method */}
              {order.shippingLines && order.shippingLines.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    {t('shippingMethod')}
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
                <Button as="link" href={`/${locale}/account/orders`} variant="secondary" fullWidth>
                  {t('backToAllOrders')}
                </Button>
                <Button as="link" href={`/${locale}/products`} variant="outline" fullWidth>
                  {t('continueShopping')}
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
