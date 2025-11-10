'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  const { isAuthenticated, isLoading, customer, user } = useAuth();
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
      title: "Account Management",
      items: [
        {
          href: "/account/profile",
          icon: Settings,
          title: "Profile Settings",
          description: "Update your personal information and preferences",
        },
        {
          href: "/account/security", 
          icon: Shield,
          title: "Security Settings",
          description: "Manage password, 2FA, and login history",
        },
        {
          href: "/account/addresses",
          icon: MapPin,
          title: "Address Book", 
          description: "Manage shipping and billing addresses",
        },
        {
          href: "/account/preferences",
          icon: Bell,
          title: "Email Preferences",
          description: "Control notifications and marketing emails",
        },
      ]
    },
    {
      title: "Orders & Shopping",
      items: [
        {
          href: "/account/orders",
          icon: Package,
          title: "Order History",
          description: "View and track your orders",
        },
        {
          href: "/account/returns",
          icon: RefreshCw,
          title: "Returns & Refunds",
          description: "Manage returns and refund requests",
        },
        {
          href: "/account/wishlist",
          icon: Heart,
          title: "Wishlist",
          description: "Your saved products and favorites",
        },
        {
          href: "/account/rewards",
          icon: Star,
          title: "Loyalty & Rewards",
          description: "Points balance and rewards catalog",
        },
      ]
    },
    {
      title: "Support & Help",
      items: [
        {
          href: "/account/support",
          icon: Headphones,
          title: "Customer Support",
          description: "Contact us and view support tickets",
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
                Welcome back, {customer.firstName}!
              </h1>
              <p className="text-gray-600">
                {customer.emailAddress} • Account ID: {customer.id}
              </p>
              {user?.verified && (
                <div className="flex items-center mt-1">
                  <Shield className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600 font-medium">
                    Verified Account
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
              <ShoppingBag className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-red-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Wishlist Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-600">Reward Points</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-2xl font-bold text-gray-900">$0.00</p>
                <p className="text-sm text-gray-600">Total Spent</p>
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
                        <IconComponent className="h-6 w-6 text-blue-600 mr-3 group-hover:text-blue-700" />
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
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity to show.</p>
            <p className="text-sm text-gray-400 mt-2">
              Your orders, wishlist updates, and other activities will appear here.
            </p>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
