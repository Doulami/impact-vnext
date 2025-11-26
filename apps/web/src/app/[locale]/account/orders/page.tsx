'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { GET_CUSTOMER_ORDERS } from '@/lib/graphql/auth';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, Package, Search, Filter, ChevronRight, Calendar } from 'lucide-react';
import type { Order } from '@/lib/types/auth';
import { useTranslations, useLocale } from 'next-intl';
import { formatCurrency, formatDate } from '@/lib/utils/locale-formatting';

export default function OrderHistory() {
  const { isAuthenticated, isLoading: authLoading, customer } = useAuth();
  const router = useRouter();
  const t = useTranslations('account.orders');
  const tAccount = useTranslations('account');
  const locale = useLocale();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${locale}/login?redirect=/${locale}/account/orders`);
    }
  }, [isAuthenticated, authLoading, router, locale]);

  const { data, loading, error, refetch } = useQuery<{
    activeCustomer: {
      orders: {
        items: Order[];
        totalItems: number;
      };
    };
  }>(GET_CUSTOMER_ORDERS, {
    variables: {
      options: {
        take: 50,
        sort: {
          orderPlacedAt: 'DESC'
        }
      }
    },
    skip: !isAuthenticated,
    fetchPolicy: 'network-only',
  });

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated || !customer) {
    return null;
  }

  const orders: Order[] = data?.activeCustomer?.orders?.items || [];
  const totalOrders = data?.activeCustomer?.orders?.totalItems || 0;

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      // Search filter
      if (searchTerm && !order.code.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && order.state !== statusFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.orderPlacedAt || b.updatedAt).getTime() - new Date(a.orderPlacedAt || a.updatedAt).getTime();
      } else {
        return b.totalWithTax - a.totalWithTax;
      }
    });

  const getStatusColor = (state: string) => {
    const stateColors: Record<string, string> = {
      'PaymentAuthorized': 'bg-green-100 text-green-800',
      'PaymentSettled': 'bg-green-100 text-green-800',
      'PartiallyShipped': 'bg-blue-100 text-blue-800',
      'Shipped': 'bg-blue-100 text-blue-800',
      'Delivered': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
    };
    return stateColors[state] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (state: string) => {
    const statusMap: Record<string, string> = {
      'PaymentAuthorized': t('paymentAuthorized'),
      'PaymentSettled': t('paymentSettled'),
      'PartiallyShipped': t('shipped'),
      'Shipped': t('shipped'),
      'Delivered': t('delivered'),
      'Cancelled': t('cancelled'),
      'Pending': 'Pending', // Keep as fallback
    };
    return statusMap[state] || state;
  };


  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href={`/${locale}/account`}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tAccount('backToAccount')}
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-gray-600 mt-2">
                  {t('totalOrders', { count: totalOrders })}
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">{t('allOrders')}</option>
                  <option value="PaymentAuthorized">{t('paymentAuthorized')}</option>
                  <option value="PaymentSettled">{t('paymentSettled')}</option>
                  <option value="Shipped">{t('shipped')}</option>
                  <option value="Delivered">{t('delivered')}</option>
                  <option value="Cancelled">{t('cancelled')}</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'total')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="date">{t('sortByDate')}</option>
                  <option value="total">{t('sortByTotal')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{t('errorLoading')}</p>
            </div>
          )}

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? t('noOrdersFound') : t('noOrdersYet')}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? t('noOrdersFoundDescription')
                  : t('noOrdersDescription')}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Link
                  href={`/${locale}/products`}
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700"
                >
                  {t('startShopping')}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/${locale}/account/orders/${order.code}`}
                  className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {t('orderNumber', { code: order.code })}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.state)}`}>
                            {getStatusText(order.state)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {t('orderDate', { date: formatDate(new Date(order.orderPlacedAt || order.updatedAt), locale) })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {t('items', { count: order.lines.length })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(order.totalWithTax / 100, locale)}
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 ml-auto mt-2" />
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="flex items-center gap-3 overflow-x-auto">
                      {order.lines.slice(0, 4).map((line) => (
                        <div key={line.id} className="flex-shrink-0">
                          {line.featuredAsset ? (
                            <img
                              src={line.featuredAsset.preview}
                              alt={line.productVariant.name}
                              className="w-16 h-16 object-cover rounded border border-gray-200"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                              <Package className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                      ))}
                      {order.lines.length > 4 && (
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            +{order.lines.length - 4}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}