'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { useRewardPoints } from '@/lib/hooks/useRewardPoints';
import { REDEEM_POINTS } from '@/lib/graphql/queries';
import { Star, Plus, Minus, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './Button';

interface RewardPointsRedemptionProps {
  orderTotal: number; // Order total in cents
  onRedemptionSuccess?: (newTotal: number, pointsRedeemed: number) => void;
  onRedemptionError?: (error: string) => void;
}

export default function RewardPointsRedemption({
  orderTotal,
  onRedemptionSuccess,
  onRedemptionError
}: RewardPointsRedemptionProps) {
  const { rewardPoints, settings, isEnabled, loading } = useRewardPoints();
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redemptionError, setRedemptionError] = useState('');
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);

  const [redeemPoints] = useMutation(REDEEM_POINTS);

  // Calculate discount (assuming 1 point = 1 cent discount)
  const discountAmount = pointsToRedeem;
  const newTotal = Math.max(0, orderTotal - discountAmount);

  // Reset states when reward points change
  useEffect(() => {
    setPointsToRedeem(0);
    setRedemptionError('');
    setRedemptionSuccess(false);
  }, [rewardPoints?.balance]);

  if (loading || !isEnabled || !rewardPoints || rewardPoints.balance === 0) {
    return null;
  }

  const maxRedeemablePoints = Math.min(
    rewardPoints.balance,
    settings?.maxRedeemPerOrder || Infinity,
    orderTotal // Can't redeem more than order total
  );

  const minRedeemAmount = settings?.minRedeemAmount || 1;

  const handleRedeemPoints = async () => {
    if (pointsToRedeem < minRedeemAmount) {
      setRedemptionError(`Minimum redemption amount is ${minRedeemAmount} points.`);
      return;
    }

    if (pointsToRedeem > maxRedeemablePoints) {
      setRedemptionError(`Cannot redeem more than ${maxRedeemablePoints} points.`);
      return;
    }

    setIsRedeeming(true);
    setRedemptionError('');

    try {
      const { data } = await redeemPoints({
        variables: { points: pointsToRedeem }
      });

      if (data?.redeemPoints) {
        setRedemptionSuccess(true);
        onRedemptionSuccess?.(newTotal, pointsToRedeem);
      }
    } catch (error: any) {
      const errorMessage = error.graphQLErrors?.[0]?.message || error.message || 'Failed to redeem points';
      setRedemptionError(errorMessage);
      onRedemptionError?.(errorMessage);
    } finally {
      setIsRedeeming(false);
    }
  };

  const incrementPoints = () => {
    const increment = Math.min(100, maxRedeemablePoints - pointsToRedeem);
    if (increment > 0) {
      setPointsToRedeem(prev => prev + increment);
    }
  };

  const decrementPoints = () => {
    const decrement = Math.min(100, pointsToRedeem);
    if (decrement > 0) {
      setPointsToRedeem(prev => prev - decrement);
    }
  };

  const setMaxPoints = () => {
    setPointsToRedeem(maxRedeemablePoints);
  };

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Use Reward Points
          <span className="text-sm font-normal text-gray-600">
            ({rewardPoints.balance} available)
          </span>
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isExpanded ? 'Hide' : 'Use Points'}
        </button>
      </div>

      {isExpanded && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {redemptionSuccess && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-3">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Points successfully applied to your order!</span>
            </div>
          )}

          {redemptionError && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg p-3">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{redemptionError}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Points to redeem:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={decrementPoints}
                  disabled={pointsToRedeem === 0}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  max={maxRedeemablePoints}
                  value={pointsToRedeem}
                  onChange={(e) => {
                    const value = Math.min(maxRedeemablePoints, Math.max(0, parseInt(e.target.value) || 0));
                    setPointsToRedeem(value);
                  }}
                  className="w-20 text-center border border-gray-300 rounded-md py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={incrementPoints}
                  disabled={pointsToRedeem >= maxRedeemablePoints}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <button
                onClick={setMaxPoints}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={pointsToRedeem === maxRedeemablePoints}
              >
                Use maximum ({maxRedeemablePoints} points)
              </button>
              <button
                onClick={() => setPointsToRedeem(0)}
                className="text-gray-600 hover:text-gray-700"
                disabled={pointsToRedeem === 0}
              >
                Clear
              </button>
            </div>

            {pointsToRedeem > 0 && (
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Discount:</span>
                  <span className="text-green-600 font-medium">-${(discountAmount / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>New Total:</span>
                  <span>${(newTotal / 100).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleRedeemPoints}
                variant="primary"
                size="md"
                disabled={pointsToRedeem === 0 || pointsToRedeem < minRedeemAmount || isRedeeming || redemptionSuccess}
                loading={isRedeeming}
                className="flex-1"
              >
                {redemptionSuccess ? 'Applied' : 'Apply Points'}
              </Button>
              {redemptionSuccess && (
                <Button
                  onClick={() => {
                    setPointsToRedeem(0);
                    setRedemptionSuccess(false);
                    onRedemptionSuccess?.(orderTotal, 0); // Reset to original total
                  }}
                  variant="outline"
                  size="md"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>• 1 point = $0.01 discount</p>
              <p>• Minimum redemption: {minRedeemAmount} points</p>
              <p>• Maximum per order: {settings?.maxRedeemPerOrder || 'No limit'} points</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}