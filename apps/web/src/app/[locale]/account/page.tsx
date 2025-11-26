'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRewardPoints } from '@/lib/hooks/useRewardPoints';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  User, 
  Settings, 
  Package, 
  MapPin, 
  Heart, 
  Bell, 
  Shield, 
  Headphones,
  ShoppingBag,
  CreditCard,
  Star,
  RefreshCw
} from 'lucide-react';

export default function AccountDashboard() {
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  
  const { isAuthenticated, isLoading, customer, user } = useAuth();
  const { rewardPoints, isEnabled: rewardPointsEnabled } = useRewardPoints();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
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

  // Account menu items
  const accountSections = [
    {
      title: t('accountManagement'),
      items: [
        {
          href: "/account/profile",
          icon: Settings,
          title: t('profileSettings'),
          description: t('updatePersonalInfo'),
        },
        {
          href: "/account/security", 
          icon: Shield,
          title: t('securitySettings'),
          description: t('managePasswordLogin'),
        },
        {
          href: "/account/addresses",
          icon: MapPin,
          title: t('addressBook'), 
          description: t('manageAddresses'),
        },
        {
          href: "/account/preferences",
          icon: Bell,
          title: t('emailPreferences'),
          description: t('controlNotifications'),
        },
      ]
    },
    {
      title: t('ordersAndShopping'),
      items: [
        {
          href: "/account/orders",
          icon: Package,
          title: t('orderHistory'),
          description: t('viewTrackOrders'),
        },
        {
          href: "/account/returns",
          icon: RefreshCw,
          title: t('returnsRefunds'),
          description: t('manageReturns'),
        },
        {
          href: "/account/wishlist",
          icon: Heart,
          title: t('wishlist'),
          description: t('wishlistItems'),
        },
        ...(rewardPointsEnabled ? [{
          href: "/account/rewards",
          icon: Star,
          title: t('loyaltyRewards'),
          description: t('pointsBalanceRewards'),
        }] : []),
      ]
    },
    {
      title: t('supportAndHelp'),
      items: [
        {
          href: "/account/support",
          icon: Headphones,
          title: t('customerSupport'),
          description: t('contactSupportTickets'),
        },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('welcomeBackName', { name: customer.firstName })}
              </h1>
              <p className="text-gray-600">
                {customer.emailAddress} • {t('accountId')}: {customer.id}
              </p>
              {user?.verified && (
                <div className="flex items-center mt-1">
                  <Shield className="h-4 w-4 text-green-500 me-1" />
                  <span className="text-sm text-green-600 font-medium">
                    {t('verifiedAccount')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-blue-600 me-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">{t('totalOrders')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-500 me-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">{t('wishlistItems')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500 me-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {rewardPointsEnabled ? (rewardPoints?.balance || 0) : 0}
                </p>
                <p className="text-sm text-gray-600">{t('rewardPoints')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-500 me-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">$0.00</p>
                <p className="text-sm text-gray-600">{t('totalSpent')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Sections */}
        <div className="space-y-8">
          {accountSections.map((section) => (
            <div key={section.title} className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group block p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center mb-3">
                        <IconComponent className="h-6 w-6 text-blue-600 me-3 group-hover:text-blue-700" />
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-900">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 group-hover:text-gray-700">
                        {item.description}
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">{t('recentActivity')}</h2>
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('noRecentActivity')}</p>
            <p className="text-sm text-gray-400 mt-2">
              {t('activitiesWillAppear')}
            </p>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
