'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client/react';
import { GET_CUSTOMER_REWARD_POINTS, GET_REWARD_TRANSACTION_HISTORY } from '@/lib/graphql/queries';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  ArrowLeft, 
  Star, 
  Gift, 
  TrendingUp, 
  Calendar,
  Plus,
  Minus,
  Package,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';

interface RewardTransaction {
  id: string;
  type: 'EARNED' | 'REDEEMED';
  points: number;
  orderTotal?: number;
  description: string;
  createdAt: string;
  order?: {
    id: string;
    code: string;
  };
}

interface CustomerRewardPoints {
  id: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

interface RewardPointSettings {
  enabled: boolean;
  minRedeemAmount: number;
  maxRedeemPerOrder: number;
}

export default function RewardPointsDashboard() {
  const { isAuthenticated, isLoading: authLoading, customer } = useAuth();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'points'>('date');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account/rewards');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: rewardData, loading: rewardLoading, error: rewardError, refetch } = useQuery<{
    customerRewardPoints: CustomerRewardPoints;
    rewardPointSettings: RewardPointSettings;
  }>(GET_CUSTOMER_REWARD_POINTS, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { data: historyData, loading: historyLoading, error: historyError } = useQuery<{
    rewardTransactionHistory: {
      items: RewardTransaction[];
      totalItems: number;
    };
  }>(GET_REWARD_TRANSACTION_HISTORY, {
    variables: {
      options: {
        take: 50,
        sort: {
          createdAt: 'DESC'
        }
      }
    },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  if (authLoading || (rewardLoading && !rewardData)) {
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

  // Check if rewards are enabled
  if (!rewardData?.rewardPointSettings?.enabled) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="bg-gray-50 min-h-screen">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link 
              href="/account" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Account
            </Link>
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Reward Points Coming Soon
              </h1>
              <p className="text-gray-600">
                Our loyalty rewards program is not currently active. Check back soon for exciting rewards!
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const rewardPoints = rewardData?.customerRewardPoints;
  const settings = rewardData?.rewardPointSettings;
  const transactions: RewardTransaction[] = historyData?.rewardTransactionHistory?.items || [];
  const totalTransactions = historyData?.rewardTransactionHistory?.totalItems || 0;

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter(transaction => {
      // Search filter
      if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !transaction.order?.code.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Type filter
      if (typeFilter !== 'all' && transaction.type !== typeFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else {
        return Math.abs(b.points) - Math.abs(a.points);
      }
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    return type === 'EARNED' ? Plus : Minus;
  };

  const getTransactionColor = (type: string) => {
    return type === 'EARNED' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/account" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Account
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Reward Points</h1>
                <p className="text-gray-600 mt-2">
                  Earn points with every purchase and redeem for discounts
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Error Messages */}
          {rewardError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error loading reward points. Please try again.</p>
            </div>
          )}

          {/* Points Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-full p-3">
                  <Star className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {rewardPoints?.balance || 0}
                  </p>
                  <p className="text-sm text-gray-600">Available Points</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-full p-3">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {rewardPoints?.lifetimeEarned || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Earned</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-full p-3">
                  <Gift className="h-8 w-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {rewardPoints?.lifetimeRedeemed || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Redeemed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Redemption Info */}
          {settings && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Earning Points</h3>
                  <p className="text-gray-600 text-sm">
                    Earn points automatically with every order. Points are awarded when your order is confirmed.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Redeeming Points</h3>
                  <p className="text-gray-600 text-sm">
                    Redeem points during checkout for instant discounts. 
                    Minimum redemption: {settings.minRedeemAmount} points. 
                    Maximum per order: {settings.maxRedeemPerOrder} points.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transaction History */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Transaction History
                {totalTransactions > 0 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({totalTransactions} {totalTransactions === 1 ? 'transaction' : 'transactions'})
                  </span>
                )}
              </h2>
            </div>

            {/* Filters and Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Type Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Transactions</option>
                  <option value="EARNED">Points Earned</option>
                  <option value="REDEEMED">Points Redeemed</option>
                </select>
              </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="date">Sort by Date</option>
                  <option value="points">Sort by Points</option>
                </select>
              </div>
            </div>

            {/* Transaction List */}
            {historyError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">Error loading transaction history. Please try again.</p>
              </div>
            )}

            {historyLoading && filteredTransactions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm || typeFilter !== 'all' ? 'No transactions found' : 'No transactions yet'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm || typeFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Your reward point transactions will appear here after you place orders.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const Icon = getTransactionIcon(transaction.type);
                  const colorClass = getTransactionColor(transaction.type);
                  
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`rounded-full p-2 ${transaction.type === 'EARNED' ? 'bg-green-100' : 'bg-red-100'}`}>
                          <Icon className={`h-5 w-5 ${colorClass}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          {transaction.order && (
                            <p className="text-sm text-gray-600">
                              Order: {transaction.order.code}
                            </p>
                          )}
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(transaction.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${colorClass}`}>
                          {transaction.type === 'EARNED' ? '+' : '-'}{Math.abs(transaction.points)}
                        </p>
                        <p className="text-sm text-gray-600">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}