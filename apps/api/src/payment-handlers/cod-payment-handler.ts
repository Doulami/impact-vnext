import { LanguageCode, PaymentMethodHandler, CreatePaymentResult, SettlePaymentResult } from '@vendure/core';

/**
 * Cash on Delivery (COD) Payment Handler
 * 
 * This handler allows customers to pay in cash when their order is delivered.
 * The payment is authorized immediately upon order placement, but settled manually
 * when the delivery agent confirms cash collection.
 */
export const codPaymentHandler = new PaymentMethodHandler({
  code: 'cash-on-delivery',
  description: [{
    languageCode: LanguageCode.en,
    value: 'Cash on Delivery - Pay when you receive your order'
  }],
  args: {
    // You can add configuration options here if needed
    // For example: minimum order amount, allowed regions, etc.
  },

  /**
   * Create Payment
   * Called when customer places order with COD payment method
   * Returns 'Authorized' state since we're accepting the order
   */
  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    return {
      amount: order.total,
      state: 'Authorized' as const,
      transactionId: `COD-${order.code}-${Date.now()}`,
      metadata: {
        paymentMethod: 'Cash on Delivery',
        codNote: 'Payment will be collected upon delivery',
        ...metadata
      }
    };
  },

  /**
   * Settle Payment
   * Called manually by admin when delivery agent confirms cash collection
   * This transitions the payment from 'Authorized' to 'Settled'
   */
  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
    return {
      success: true,
      metadata: {
        settledAt: new Date().toISOString(),
        note: 'Cash collected upon delivery'
      }
    };
  },

  /**
   * Cancel Payment (optional)
   * Called if order is cancelled before delivery
   */
  cancelPayment: async (ctx, order, payment, args) => {
    return {
      success: true,
      metadata: {
        cancelledAt: new Date().toISOString()
      }
    };
  }
});
