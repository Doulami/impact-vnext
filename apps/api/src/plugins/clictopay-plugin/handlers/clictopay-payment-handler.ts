import {
  PaymentMethodHandler,
  CreatePaymentResult,
  SettlePaymentResult,
  CancelPaymentResult,
  CreatePaymentErrorResult,
  SettlePaymentErrorResult,
  CancelPaymentErrorResult,
  LanguageCode,
  Logger,
  Order,
  RequestContext,
  Injector,
} from '@vendure/core';
import { ClicToPayApiService } from '../services/clictopay-api.service';
import { ClicToPayConfigService } from '../services/clictopay-config.service';
import {
  ClicToPayRegisterRequest,
  ClicToPayPaymentMetadata,
  ClicToPaymentStatus,
  SUPPORTED_CURRENCIES,
} from '../types/clictopay-api.types';

/**
 * ClicToPay Payment Method Handler
 * 
 * Implements Vendure's PaymentMethodHandler interface for ClicToPay payment gateway.
 * Handles payment creation, settlement, and cancellation through ClicToPay API.
 */
export const clicToPayPaymentHandler = new PaymentMethodHandler({
  code: 'clictopay',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'ClicToPay Payment Gateway',
    },
    {
      languageCode: LanguageCode.fr,
      value: 'Passerelle de paiement ClicToPay',
    },
  ],
  args: {
    // No configuration args - all config comes from ClicToPayConfigService
  },

  /**
   * Create payment intent with ClicToPay
   * This is called when customer selects ClicToPay at checkout
   */
  createPayment: async (
    ctx: RequestContext,
    order: Order,
    amount: number,
    args: any,
    metadata: Record<string, any>,
    method: any
  ): Promise<CreatePaymentResult | CreatePaymentErrorResult> => {
    const loggerCtx = 'ClicToPayPaymentHandler';

    try {
      // Get services from Vendure's injector
      const connection = method.injector?.get('TransactionalConnection');
      const configService = new ClicToPayConfigService(connection);
      const apiService = new ClicToPayApiService();

      // Check if ClicToPay is enabled
      const configCheck = await configService.getConfig(ctx);
      const isEnabled = await configService.isEnabled(ctx);
      
      Logger.info(
        `ClicToPay configuration check - enabled: ${configCheck.enabled}, hasUsername: ${!!configCheck.username}, hasPassword: ${!!configCheck.password}, isEnabled: ${isEnabled}`,
        loggerCtx
      );
      
      if (!isEnabled) {
        Logger.warn(
          `ClicToPay payment rejected - config enabled: ${configCheck.enabled}, username: ${configCheck.username ? '[SET]' : '[NOT SET]'}, password: ${configCheck.password ? '[SET]' : '[NOT SET]'}`,
          loggerCtx
        );
        return {
          state: 'Error' as any,
          amount,
          errorMessage: 'ClicToPay payment method is not available',
        };
      }

      // Get configuration
      const config = await configService.getConfig(ctx);
      
      // Validate currency support and get ClicToPay currency code
      const currencyCode = order.currencyCode;
      const currencyConfig = SUPPORTED_CURRENCIES[currencyCode];
      if (!currencyConfig?.supported) {
        return {
          state: 'Error' as any,
          amount,
          errorMessage: `Currency ${currencyCode} is not supported by ClicToPay`,
        };
      }
      
      // Use ClicToPay currency code (e.g., '788' for TND)
      const clicToPayCurrency = currencyConfig.code;

      // Build return URLs
      const baseUrl = process.env.STOREFRONT_URL || 'http://localhost:3001';
      const successUrl = apiService.buildReturnUrl(baseUrl, order.code, true);
      const failureUrl = apiService.buildReturnUrl(baseUrl, order.code, false);
      const webhookUrl = apiService.buildWebhookUrl(baseUrl);

      // Prepare registration request with all required parameters
      const registrationRequest: ClicToPayRegisterRequest = {
        userName: config.username,
        password: config.password,
        amount: amount, // Amount is already in cents from Vendure
        currency: clicToPayCurrency, // Use ClicToPay currency code (e.g., '788' for TND)
        language: 'en', // Required by ClicToPay API
        orderNumber: order.code,
        returnUrl: successUrl,
        failUrl: failureUrl,
        callbackUrl: webhookUrl,
        description: `Order ${order.code} - ${order.lines.length} items`,
        clientId: order.customer?.emailAddress || '',
        sessionTimeoutSecs: 1800, // 30 minutes
        pageView: 'WEB',
      };

      Logger.info(
        `Creating ClicToPay payment for order ${order.code}, amount: ${amount} ${currencyCode}`,
        loggerCtx
      );

      // Register payment with ClicToPay
      const result = await apiService.registerPayment(config, registrationRequest);

      if (!result.success) {
        Logger.error(
          `ClicToPay payment registration failed: ${result.errorMessage}`,
          loggerCtx
        );

        return {
          state: 'Error' as any,
          amount,
          errorMessage: result.errorMessage || 'Payment registration failed',
        };
      }

      // Create payment metadata for tracking
      const paymentMetadata: ClicToPayPaymentMetadata = {
        clicToPayOrderId: result.clicToPayOrderId!,
        registrationRequest,
        registrationResponse: {
          orderId: result.clicToPayOrderId!,
          formUrl: result.redirectUrl!,
          errorCode: '0',
        },
        statusHistory: [{
          status: ClicToPaymentStatus.PENDING,
          timestamp: new Date().toISOString(),
          source: 'manual',
        }],
        retryCount: 0,
        testMode: config.testMode,
      };

      Logger.info(
        `ClicToPay payment created successfully - Redirect URL: ${result.redirectUrl}`,
        loggerCtx
      );

      // Return success with redirect URL
      return {
        state: 'Authorized' as any, // Payment is authorized pending customer action
        amount: amount,
        metadata: paymentMetadata,
      };

    } catch (error) {
      Logger.error(
        `ClicToPay payment creation failed: ${error instanceof Error ? error.message : String(error)}`,
        loggerCtx
      );

      return {
        state: 'Error' as any,
        amount,
        errorMessage: 'Payment creation failed. Please try again.',
      };
    }
  },

  /**
   * Settle payment after successful ClicToPay transaction
   * This is called when webhook confirms payment or manual status check succeeds
   */
  settlePayment: async (
    ctx: RequestContext,
    order: Order,
    payment: any,
    args: any
  ): Promise<SettlePaymentResult | SettlePaymentErrorResult> => {
    const loggerCtx = 'ClicToPayPaymentHandler';

    try {
      const metadata = payment.metadata as ClicToPayPaymentMetadata;
      
      // Get services
      const connection = args.injector?.get('TransactionalConnection');
      const configService = new ClicToPayConfigService(connection);
      const apiService = new ClicToPayApiService();
      const config = await configService.getConfig(ctx);

      // Check payment status with ClicToPay
      const statusResult = await apiService.checkPaymentStatus(
        config,
        metadata.clicToPayOrderId,
        order.code
      );

      if (!statusResult.success) {
        Logger.error(
          `Payment settlement failed - status check error: ${statusResult.errorMessage}`,
          loggerCtx
        );

        return {
          success: false,
          errorMessage: statusResult.errorMessage || 'Payment status verification failed',
        };
      }

      // Check if payment is actually settled
      if (statusResult.status === ClicToPaymentStatus.SETTLED) {
        // Update metadata with settlement info
        const updatedMetadata: ClicToPayPaymentMetadata = {
          ...metadata,
          statusHistory: [
            ...metadata.statusHistory,
            {
              status: ClicToPaymentStatus.SETTLED,
              timestamp: new Date().toISOString(),
              source: 'status_check',
            },
          ],
          lastStatusCheck: new Date().toISOString(),
        };

        Logger.info(
          `Payment settled successfully for order ${order.code}`,
          loggerCtx
        );

        return {
          success: true,
          metadata: updatedMetadata,
        };
      } else {
        // Payment not yet settled
        Logger.warn(
          `Payment settlement attempted but status is ${statusResult.status}`,
          loggerCtx
        );

        return {
          success: false,
          errorMessage: `Payment not settled - current status: ${statusResult.status}`,
        };
      }

    } catch (error) {
      Logger.error(
        `Payment settlement failed: ${error instanceof Error ? error.message : String(error)}`,
        loggerCtx
      );

      return {
        success: false,
        errorMessage: 'Payment settlement failed. Please contact support.',
      };
    }
  },

  /**
   * Cancel payment (not supported by ClicToPay, but required by interface)
   */
  cancelPayment: async (
    ctx: RequestContext,
    order: Order,
    payment: any,
    args: any
  ): Promise<CancelPaymentResult | CancelPaymentErrorResult> => {
    const loggerCtx = 'ClicToPayPaymentHandler';

    Logger.info(
      `Payment cancellation requested for order ${order.code} (ClicToPay does not support cancellation)`,
      loggerCtx
    );

    // ClicToPay doesn't support payment cancellation through API
    // We mark the payment as cancelled in Vendure but can't cancel it at ClicToPay
    return {
      success: true,
      metadata: {
        ...(payment.metadata || {}),
        cancelledAt: new Date().toISOString(),
        cancellationReason: 'Cancelled in Vendure (not supported by ClicToPay)',
      },
    };
  },

  /**
   * Create refund (not supported by ClicToPay API)
   */
  createRefund: async (
    ctx: RequestContext,
    input: any,
    amount: number,
    order: Order,
    payment: any,
    args: any
  ) => {
    const loggerCtx = 'ClicToPayPaymentHandler';

    Logger.warn(
      `Refund requested for order ${order.code} - ClicToPay does not support automated refunds`,
      loggerCtx
    );

    // ClicToPay doesn't support automated refunds through API
    // Refunds must be processed manually through ClicToPay dashboard
    throw new Error(
      'ClicToPay does not support automated refunds. Please process refund manually through ClicToPay merchant dashboard.'
    );
  },

  /**
   * Handle payment state transitions if needed
   */
  onStateTransitionStart: async (fromState, toState, data) => {
    return true;
  },
});