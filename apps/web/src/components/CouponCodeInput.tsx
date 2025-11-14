'use client';

import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { APPLY_COUPON_CODE, REMOVE_COUPON_CODE } from '@/lib/graphql/checkout';
import Button from './Button';
import { X } from 'lucide-react';

interface CouponCodeInputProps {
  appliedCoupons: string[];
  onSuccess?: () => void;
}

export default function CouponCodeInput({ appliedCoupons, onSuccess }: CouponCodeInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [error, setError] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const [applyCoupon] = useMutation(APPLY_COUPON_CODE);
  const [removeCoupon] = useMutation(REMOVE_COUPON_CODE);

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplying(true);
    setError('');
    
    try {
      const result = await applyCoupon({
        variables: { couponCode: couponCode.trim().toUpperCase() }
      });
      
      if (result.data?.applyCouponCode.__typename === 'Order') {
        setCouponCode('');
        onSuccess?.();
      } else {
        // Handle error types
        const errorResult = result.data?.applyCouponCode;
        setError(errorResult?.message || 'Invalid coupon code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply coupon code');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRemove = async (code: string) => {
    try {
      await removeCoupon({ variables: { couponCode: code } });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to remove coupon code');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleApply()}
          placeholder="Enter coupon code"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
          disabled={isApplying}
        />
        <Button
          onClick={handleApply}
          disabled={isApplying || !couponCode.trim()}
          variant="secondary"
        >
          {isApplying ? 'Applying...' : 'Apply'}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {appliedCoupons.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Applied Coupons:</p>
          {appliedCoupons.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2 rounded"
            >
              <span className="text-sm font-medium text-green-800">{code}</span>
              <button
                onClick={() => handleRemove(code)}
                className="text-green-600 hover:text-green-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
