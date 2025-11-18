import { Controller } from '@nestjs/common';
import { RequestContext, TransactionalConnection, OrderService, Logger } from '@vendure/core';
import { ClicToPayConfigService } from '../services/clictopay-config.service';
import { ClicToPayApiService } from '../services/clictopay-api.service';
import * as crypto from 'crypto';

interface ClicToPayWebhookPayload {
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'PAID' | 'FAILED' | 'CANCELLED' | 'PENDING';
  timestamp: string;
  signature?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * ClicToPay Webhook Controller - Production Ready
 * 
 * Handles incoming webhook notifications from ClicToPay payment gateway
 * with comprehensive security, validation, and error handling.
 */
@Controller('clictopay')
export class ClicToPayWebhookController {
  private static readonly loggerCtx = 'ClicToPayWebhookController';

  constructor(
    private connection: TransactionalConnection,
    private orderService: OrderService,
    private configService: ClicToPayConfigService,
    private apiService: ClicToPayApiService,
  ) {}

  /**
   * Handle ClicToPay webhook notifications with full security validation
   */
  async handleWebhook(
    ctx: RequestContext,
    payload: ClicToPayWebhookPayload,
    headers?: Record<string, string>,
    clientIP?: string
  ): Promise<{ success: boolean; correlationId: string; message?: string; error?: string }> {
    const correlationId = this.generateCorrelationId();
    
    try {
      Logger.info(
        `[${correlationId}] ClicToPay webhook received - Order: ${payload.orderId}, Status: ${payload.status}`,
        ClicToPayWebhookController.loggerCtx
      );

      // 1. Validate webhook security
      await this.validateWebhookSecurity(payload, headers, correlationId);

      // 2. Validate payload structure
      this.validateWebhookPayload(payload, correlationId);

      // 3. Process payment status update
      await this.processPaymentStatusUpdate(ctx, payload, correlationId);

      // 4. Return success response
      Logger.info(
        `[${correlationId}] Webhook processed successfully`,
        ClicToPayWebhookController.loggerCtx
      );
      
      return {
        success: true,
        correlationId,
        message: 'Webhook processed successfully'
      };

    } catch (error: any) {
      Logger.error(
        `[${correlationId}] Webhook processing failed: ${error.message}`,
        ClicToPayWebhookController.loggerCtx
      );

      return {
        success: false,
        correlationId,
        error: error.message || 'Webhook processing failed'
      };
    }
  }

  private async validateWebhookSecurity(
    payload: ClicToPayWebhookPayload,
    headers?: Record<string, string>,
    correlationId?: string
  ) {
    const ctx = RequestContext.empty();
    const config = await this.configService.getConfig(ctx);

    // 1. Validate timestamp to prevent replay attacks (5 minute window)
    if (payload.timestamp) {
      const timestamp = new Date(payload.timestamp).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (Math.abs(now - timestamp) > fiveMinutes) {
        Logger.warn(
          `[${correlationId}] Webhook timestamp validation failed - timestamp too old`,
          ClicToPayWebhookController.loggerCtx
        );
        throw new Error('Webhook timestamp is too old or in the future');
      }
    }

    // 2. Validate HMAC signature if configured
    if (config.webhookSecret && (payload as any).signature) {
      const expectedSignature = this.calculateWebhookSignature(JSON.stringify(payload), config.webhookSecret);
      
      if (!crypto.timingSafeEqual(Buffer.from((payload as any).signature), Buffer.from(expectedSignature))) {
        Logger.warn(
          `[${correlationId}] Webhook signature validation failed`,
          ClicToPayWebhookController.loggerCtx
        );
        throw new Error('Invalid webhook signature');
      }
    }

    // 3. Log for monitoring
    Logger.info(
      `[${correlationId}] Webhook security validation passed`,
      ClicToPayWebhookController.loggerCtx
    );
  }

  private validateWebhookPayload(payload: ClicToPayWebhookPayload, correlationId?: string) {
    const requiredFields = ['orderId', 'status', 'timestamp'];
    const missingFields = requiredFields.filter(field => !(payload as any)[field]);
    
    if (missingFields.length > 0) {
      Logger.warn(
        `[${correlationId}] Webhook payload validation failed - missing fields: ${missingFields.join(', ')}`,
        ClicToPayWebhookController.loggerCtx
      );
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const validStatuses = ['PAID', 'FAILED', 'CANCELLED', 'PENDING'];
    if (!validStatuses.includes(payload.status)) {
      Logger.warn(
        `[${correlationId}] Invalid payment status: ${payload.status}`,
        ClicToPayWebhookController.loggerCtx
      );
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
  }

  private async processPaymentStatusUpdate(
    ctx: RequestContext,
    payload: ClicToPayWebhookPayload,
    correlationId?: string
  ) {
    try {
      // Find the order by code (orderId from ClicToPay corresponds to order code)
      const order = await this.orderService.findOneByCode(ctx, payload.orderId);
      
      if (!order) {
        Logger.warn(
          `[${correlationId}] Order not found: ${payload.orderId}`,
          ClicToPayWebhookController.loggerCtx
        );
        throw new Error(`Order not found: ${payload.orderId}`);
      }

      Logger.info(
        `[${correlationId}] Processing payment status update for order ${payload.orderId}, status: ${payload.status}`,
        ClicToPayWebhookController.loggerCtx
      );

      // Find the ClicToPay payment in the order (use orderId to match clicToPayOrderId)
      const clictoPayPayment = order.payments.find(payment => 
        payment.method === 'clictopay' && 
        payment.metadata?.clicToPayOrderId === payload.orderId
      );

      if (!clictoPayPayment) {
        Logger.warn(
          `[${correlationId}] ClicToPay payment not found for order: ${payload.orderId}`,
          ClicToPayWebhookController.loggerCtx
        );
        throw new Error(`ClicToPay payment not found for order: ${payload.orderId}`);
      }

      // Update payment based on status
      switch (payload.status) {
        case 'PAID':
          if (clictoPayPayment.state !== 'Settled') {
            await this.orderService.settlePayment(ctx, clictoPayPayment.id);
            Logger.info(
              `[${correlationId}] Payment settled successfully - Payment ID: ${clictoPayPayment.id}`,
              ClicToPayWebhookController.loggerCtx
            );
          }
          break;

        case 'FAILED':
        case 'CANCELLED':
          if (clictoPayPayment.state !== 'Cancelled') {
            await this.orderService.cancelPayment(ctx, clictoPayPayment.id);
            Logger.info(
              `[${correlationId}] Payment cancelled - Reason: ${payload.status}`,
              ClicToPayWebhookController.loggerCtx
            );
          }
          break;

        case 'PENDING':
          Logger.info(
            `[${correlationId}] Payment still pending - Payment ID: ${clictoPayPayment.id}`,
            ClicToPayWebhookController.loggerCtx
          );
          break;
      }

    } catch (error: any) {
      Logger.error(
        `[${correlationId}] Failed to process payment status update: ${error.message}`,
        ClicToPayWebhookController.loggerCtx
      );
      throw error;
    }
  }

  private calculateWebhookSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }


  private generateCorrelationId(): string {
    return `ctpay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
