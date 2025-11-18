'use client';

import { useState } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import { 
  ADD_PAYMENT_TO_ORDER, 
  TRANSITION_TO_ARRANGING_PAYMENT,
  GET_ACTIVE_ORDER_STATE 
} from '@/lib/graphql/checkout';
import { getPaymentMethodConfig } from '@/lib/utils/payment-methods';
import { useClicToPayment } from './useClicToPayment';

export interface PaymentResult {
  success: boolean;
  redirectUrl?: string;
  orderId?: string;
  transactionId?: string;
  error?: string;
  requiresRedirect?: boolean;
}

export interface PaymentMetadata {
  [key: string]: any;
}

/**
 * Generic Payment Processing Hook
 * 
 * Handles payment processing for any payment method dynamically,
 * with special handling for redirect-based payments like ClicToPay.
 */
export function usePaymentProcessor() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GraphQL mutations and queries
  const [createPayment] = useMutation(ADD_PAYMENT_TO_ORDER);
  const [transitionToPayment] = useMutation(TRANSITION_TO_ARRANGING_PAYMENT);
  const [getOrderState] = useLazyQuery(GET_ACTIVE_ORDER_STATE);

  // ClicToPay specific hook for redirect handling
  const clicToPayHook = useClicToPayment();

  /**
   * Process payment for any payment method
   */
  const processPayment = async (
    paymentMethodCode: string,
    orderTotal: number,
    metadata: PaymentMetadata = {}
  ): Promise<PaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Processing payment with method: ${paymentMethodCode}`);

      // Get payment method configuration
      const config = getPaymentMethodConfig({ code: paymentMethodCode } as any);

      // For redirect-based payment methods, use specialized handling
      if (config.requiresRedirect) {
        return await handleRedirectPayment(paymentMethodCode, orderTotal, metadata);
      }

      // For instant payment methods, use standard processing
      return await handleInstantPayment(paymentMethodCode, orderTotal, metadata);

    } catch (err: any) {
      console.error('Payment processing error:', err);
      const errorMessage = err.graphQLErrors?.[0]?.message || err.message || 'Payment processing failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle redirect-based payments (ClicToPay, PayPal, etc.)
   */
  const handleRedirectPayment = async (
    paymentMethodCode: string,
    orderTotal: number,
    metadata: PaymentMetadata
  ): Promise<PaymentResult> => {
    console.log(`Handling redirect payment for method: ${paymentMethodCode}`);

    // For ClicToPay and similar payment gateways
    if (paymentMethodCode.toLowerCase().includes('clictopay')) {
      const result = await clicToPayHook.initiatePayment(orderTotal, paymentMethodCode);
      return {
        ...result,
        requiresRedirect: true
      };
    }

    // For other redirect payment methods, use standard flow with redirect flag
    return await handleInstantPayment(paymentMethodCode, orderTotal, {
      ...metadata,
      requiresRedirect: true
    });
  };

  /**
   * Handle instant/direct payment methods (COD, cards, etc.)
   */
  const handleInstantPayment = async (
    paymentMethodCode: string,
    orderTotal: number,
    metadata: PaymentMetadata
  ): Promise<PaymentResult> => {
    console.log(`Handling instant payment for method: ${paymentMethodCode}`);

    // Step 1: Check current order state
    const { data: orderStateData } = await getOrderState();
    const currentOrderState = orderStateData?.activeOrder?.state;
    console.log('Current order state:', currentOrderState);

    // Step 2: Transition to ArrangingPayment if not already there
    if (currentOrderState !== 'ArrangingPayment') {
      console.log('Transitioning order to ArrangingPayment state...');
      const transitionResult = await transitionToPayment();

      const transitionData = transitionResult.data?.transitionOrderToState;
      if (transitionData?.__typename !== 'Order') {
        const errorMessage = transitionData?.message || 'Failed to transition order to payment state';
        throw new Error(errorMessage);
      }
    }

    // Step 3: Create payment
    const paymentMetadata = {
      paymentType: paymentMethodCode,
      amount: orderTotal,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    const { data } = await createPayment({
      variables: {
        input: {
          method: paymentMethodCode,
          metadata: paymentMetadata
        }
      }
    });

    const result = data?.addPaymentToOrder;

    if (result?.__typename === 'Order') {
      // Payment succeeded
      const payment = result.payments?.[result.payments.length - 1];
      
      return {
        success: true,
        orderId: result.code,
        transactionId: payment?.id,
        requiresRedirect: false
      };
    } else {
      // Payment failed
      const errorMessage = result?.message || 'Payment failed';
      console.error('Payment failed:', result);
      throw new Error(errorMessage);
    }
  };

  /**
   * Handle payment method-specific redirects
   */
  const handleRedirect = (redirectUrl: string) => {
    console.log('Redirecting to payment gateway:', redirectUrl);
    window.location.href = redirectUrl;
  };

  return {
    loading,
    error,
    processPayment,
    handleRedirect,
    clearError: () => setError(null),
    // Expose ClicToPay specific methods for compatibility
    clicToPayLoading: clicToPayHook.loading,
    clicToPayError: clicToPayHook.error,
    redirectToClicToPay: clicToPayHook.redirectToClicToPay,
    checkPaymentStatus: clicToPayHook.checkStatus
  };
}