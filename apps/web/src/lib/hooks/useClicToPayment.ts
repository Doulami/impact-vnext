'use client';

import { useState } from 'react';
import { useMutation, useLazyQuery } from '@apollo/client/react';
import { CREATE_CLICTOPAY_PAYMENT, CHECK_CLICTOPAY_PAYMENT_STATUS, TRANSITION_TO_ARRANGING_PAYMENT, GET_ACTIVE_ORDER_STATE } from '@/lib/graphql/checkout';

export interface ClicToPaymentResult {
  success: boolean;
  redirectUrl?: string;
  orderId?: string;
  transactionId?: string;
  error?: string;
}

export interface PaymentStatus {
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';
  orderCode?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  message?: string;
}

export function useClicToPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createPayment] = useMutation(CREATE_CLICTOPAY_PAYMENT);
  const [checkPaymentStatus] = useLazyQuery(CHECK_CLICTOPAY_PAYMENT_STATUS);
  const [transitionToPayment] = useMutation(TRANSITION_TO_ARRANGING_PAYMENT);
  const [getOrderState] = useLazyQuery(GET_ACTIVE_ORDER_STATE);

  const initiatePayment = async (orderTotal: number, paymentMethodCode: string): Promise<ClicToPaymentResult> => {
    setLoading(true);
    setError(null);

    try {
      console.log(`Initiating payment with method '${paymentMethodCode}' for amount:`, orderTotal);
      console.log('Window origin for return URLs:', window.location.origin);

      // Step 1: Check current order state
      console.log('Checking current order state...');
      const { data: orderStateData } = await getOrderState();
      const currentOrderState = orderStateData?.activeOrder?.state;
      console.log('Current order state:', currentOrderState);

      // Step 2: Transition to ArrangingPayment if not already there
      if (currentOrderState !== 'ArrangingPayment') {
        console.log('Transitioning order to ArrangingPayment state...');
        const transitionResult = await transitionToPayment();
        console.log('Transition result:', transitionResult);

        // Check if transition failed
        const transitionData = transitionResult.data?.transitionOrderToState;
        if (transitionData?.__typename !== 'Order') {
          const errorMessage = transitionData?.message || 'Failed to transition order to payment state';
          console.error('Order state transition failed:', transitionData);
          throw new Error(errorMessage);
        }
      } else {
        console.log('Order is already in ArrangingPayment state, skipping transition');
      }

      // Step 3: Create payment
      console.log('Creating ClicToPay payment...');
      
      const paymentInput = {
        method: paymentMethodCode,
        metadata: {
          amount: orderTotal,
          currency: 'EUR', // Default to EUR, can be made configurable
          returnUrl: `${window.location.origin}/payment/success`,
          cancelUrl: `${window.location.origin}/payment/failure`,
          description: 'Order Payment'
        }
      };
      
      console.log('Payment mutation variables:', {
        input: paymentInput,
        paymentMethodCode,
        orderTotal
      });
      
      const { data } = await createPayment({
        variables: {
          input: paymentInput
        }
      });

      const result = data?.addPaymentToOrder;

      console.log('ClicToPay GraphQL response:', {
        data,
        result,
        resultType: result?.__typename,
        hasPayments: result?.payments?.length,
        orderCode: result?.code
      });

      if (result?.__typename === 'Order') {
        // Payment creation succeeded, extract redirect URL from payment metadata
        const payment = result.payments?.[result.payments.length - 1]; // Get the latest payment
        const redirectUrl = payment?.metadata?.redirectUrl;

        if (redirectUrl) {
          console.log('ClicToPay payment initiated successfully, redirect URL:', redirectUrl);
          return {
            success: true,
            redirectUrl,
            orderId: result.code,
            transactionId: payment?.metadata?.transactionId
          };
        } else {
          throw new Error('No redirect URL received from ClicToPay');
        }
      } else {
        // Handle various error types
        console.error('ClicToPay payment failed with error type:', {
          typename: result?.__typename,
          errorCode: result?.errorCode,
          message: result?.message,
          fullResult: result
        });
        
        let errorMessage = 'Payment initialization failed';
        if (result?.message) {
          errorMessage = result.message;
        } else if (result?.errorCode) {
          errorMessage = `Payment failed: ${result.errorCode}`;
        } else if (result?.__typename) {
          errorMessage = `Payment failed: ${result.__typename}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (err: any) {
      console.error('ClicToPay payment error details:', {
        error: err,
        graphQLErrors: err.graphQLErrors,
        networkError: err.networkError,
        message: err.message,
        stack: err.stack
      });
      
      let errorMessage = 'Failed to initialize payment';
      
      if (err.graphQLErrors && err.graphQLErrors.length > 0) {
        errorMessage = err.graphQLErrors[0].message;
      } else if (err.networkError) {
        errorMessage = `Network error: ${err.networkError.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (orderId: string): Promise<PaymentStatus> => {
    setLoading(true);
    setError(null);

    try {
      console.log('Checking ClicToPay payment status for order:', orderId);

      const { data } = await checkPaymentStatus({
        variables: { orderId },
        fetchPolicy: 'network-only' // Always fetch fresh data
      });

      const statusData = data?.checkPaymentStatus;

      if (statusData) {
        console.log('Payment status check result:', statusData);
        return {
          status: statusData.status || 'UNKNOWN',
          orderCode: statusData.orderCode,
          transactionId: statusData.transactionId,
          amount: statusData.amount,
          currency: statusData.currency,
          message: statusData.message
        };
      } else {
        throw new Error('No status data received');
      }
    } catch (err: any) {
      console.error('Payment status check error:', err);
      const errorMessage = err.graphQLErrors?.[0]?.message || err.message || 'Failed to check payment status';
      setError(errorMessage);
      return {
        status: 'UNKNOWN',
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const redirectToClicToPay = (redirectUrl: string) => {
    console.log('Redirecting to ClicToPay:', redirectUrl);
    window.location.href = redirectUrl;
  };

  return {
    loading,
    error,
    initiatePayment,
    checkStatus,
    redirectToClicToPay,
    clearError: () => setError(null)
  };
}