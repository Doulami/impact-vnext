'use client';

import { useState } from 'react';
import { CreditCard, ExternalLink, Shield, Clock } from 'lucide-react';
import { useClicToPayment } from '@/lib/hooks/useClicToPayment';
import Button from '@/components/Button';

interface ClicToPayButtonProps {
  orderTotal: number;
  paymentMethodCode: string; // Dynamic payment method code
  onPaymentInitiated?: (orderId: string, transactionId?: string) => void;
  onPaymentError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function ClicToPayButton({
  orderTotal,
  paymentMethodCode,
  onPaymentInitiated,
  onPaymentError,
  disabled = false,
  className = ''
}: ClicToPayButtonProps) {
  const [isInitiating, setIsInitiating] = useState(false);
  const { loading, error, initiatePayment, redirectToClicToPay, clearError } = useClicToPayment();

  const handleClicToPayClick = async () => {
    setIsInitiating(true);
    clearError();

    try {
      const result = await initiatePayment(orderTotal, paymentMethodCode);

      if (result.success && result.redirectUrl) {
        // Notify parent component about payment initiation
        if (onPaymentInitiated && result.orderId) {
          onPaymentInitiated(result.orderId, result.transactionId);
        }

        // Small delay to ensure any state updates complete
        setTimeout(() => {
          redirectToClicToPay(result.redirectUrl!);
        }, 100);
      } else {
        const errorMsg = result.error || 'Failed to initiate ClicToPay payment';
        if (onPaymentError) {
          onPaymentError(errorMsg);
        }
      }
    } catch (err: any) {
      console.error('ClicToPay button error:', err);
      const errorMsg = err.message || 'Unexpected error occurred';
      if (onPaymentError) {
        onPaymentError(errorMsg);
      }
    } finally {
      setIsInitiating(false);
    }
  };

  const isLoading = loading || isInitiating;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ClicToPay Option Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-gray-900">ClicToPay</h3>
          <p className="text-sm text-gray-600">Secure online payment gateway</p>
        </div>
      </div>

      {/* Payment Method Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Secure Payment with ClicToPay
            </p>
            <p className="text-xs text-blue-700 mb-2">
              Pay securely using your credit card, debit card, or bank account through ClicToPay&apos;s encrypted payment gateway.
            </p>
            <div className="flex items-center space-x-4 text-xs text-blue-600">
              <div className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>256-bit SSL</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Instant processing</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Payment Amount */}
      <div className="bg-gray-50 rounded-lg p-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Payment Amount:</span>
          <span className="text-lg font-bold text-gray-900">
            €{(orderTotal / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Payment Button */}
      <Button
        onClick={handleClicToPayClick}
        disabled={disabled || isLoading}
        loading={isLoading}
        variant="primary"
        size="lg"
        fullWidth
        className="relative"
      >
        <div className="flex items-center justify-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>
            {isLoading ? 'Initializing Payment...' : 'Pay with ClicToPay'}
          </span>
          <ExternalLink className="w-4 h-4 opacity-75" />
        </div>
      </Button>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          🔒 You will be redirected to ClicToPay&apos;s secure payment page
        </p>
      </div>
    </div>
  );
}