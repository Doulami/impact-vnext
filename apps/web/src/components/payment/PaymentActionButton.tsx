'use client';

import React from 'react';
import Button from '@/components/Button';
import ClicToPayButton from './ClicToPayButton';
import { PaymentMethod, getPaymentMethodConfig } from '@/lib/utils/payment-methods';

interface PaymentActionButtonProps {
  method: PaymentMethod;
  orderTotal: number;
  onPaymentSuccess: (orderId: string, transactionId?: string) => void;
  onPaymentError: (error: string) => void;
  onStandardPayment: (methodCode: string) => void;
  disabled?: boolean;
}

/**
 * Dynamic Payment Action Button Component
 * 
 * Renders the appropriate payment action button based on the payment method type.
 * For special methods like ClicToPay, renders custom components.
 * For standard methods, renders a generic payment button.
 */
export default function PaymentActionButton({
  method,
  orderTotal,
  onPaymentSuccess,
  onPaymentError,
  onStandardPayment,
  disabled = false
}: PaymentActionButtonProps) {
  const config = getPaymentMethodConfig(method);

  // Handle custom payment components
  if (config.customComponent === 'ClicToPayButton') {
    return (
      <ClicToPayButton
        orderTotal={orderTotal}
        paymentMethodCode={method.code}
        onPaymentInitiated={onPaymentSuccess}
        onPaymentError={onPaymentError}
        disabled={disabled}
        className="w-full"
      />
    );
  }

  // Handle other custom components (Stripe, PayPal, etc.)
  if (config.customComponent === 'StripePayment') {
    // TODO: Implement Stripe component when needed
    return (
      <Button
        onClick={() => onPaymentError('Stripe payment not implemented yet')}
        variant="primary"
        size="lg"
        fullWidth
        disabled={disabled}
      >
        Pay with Stripe (Coming Soon)
      </Button>
    );
  }

  // Default button for standard payment methods
  const buttonText = config.requiresRedirect 
    ? `Continue to ${method.name}`
    : `Place Order (${method.name})`;

  return (
    <Button
      onClick={() => onStandardPayment(method.code)}
      variant="primary"
      size="lg"
      fullWidth
      disabled={disabled}
      className="relative"
    >
      {buttonText}
      {config.requiresRedirect && (
        <span className="ml-2 text-sm opacity-75">→</span>
      )}
    </Button>
  );
}