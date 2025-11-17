import { useQuery } from '@apollo/client/react';
import { useAuth } from './useAuth';
import { GET_CUSTOMER_REWARD_POINTS, GET_REWARD_POINTS_SETTINGS } from '@/lib/graphql/queries';

export interface RewardPointSettings {
  enabled: boolean;
  minRedeemAmount: number;
  maxRedeemPerOrder: number;
}

export interface CustomerRewardPoints {
  id: string;
  balance: number;
  availablePoints: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

export function useRewardPoints() {
  const { isAuthenticated } = useAuth();

  const { data: rewardData, loading: rewardLoading, error: rewardError, refetch } = useQuery<{
    customerRewardPoints: CustomerRewardPoints;
    rewardPointSettings: RewardPointSettings;
  }>(GET_CUSTOMER_REWARD_POINTS, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const { data: settingsData, loading: settingsLoading } = useQuery<{
    rewardPointSettings: RewardPointSettings;
  }>(GET_REWARD_POINTS_SETTINGS, {
    fetchPolicy: 'cache-first',
    errorPolicy: 'all',
  });

  const settings = rewardData?.rewardPointSettings || settingsData?.rewardPointSettings;
  const rewardPoints = rewardData?.customerRewardPoints;

  return {
    rewardPoints,
    settings,
    loading: rewardLoading || settingsLoading,
    error: rewardError,
    refetch,
    isEnabled: settings?.enabled ?? false,
  };
}