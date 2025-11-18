import { Injectable } from '@nestjs/common';
import { Logger } from '@vendure/core';

export interface PaymentEvent {
  eventType: 'PAYMENT_INITIATED' | 'PAYMENT_COMPLETED' | 'PAYMENT_FAILED' | 'PAYMENT_CANCELLED' | 'WEBHOOK_RECEIVED' | 'API_CALL' | 'ERROR_OCCURRED';
  orderId: string;
  correlationId: string;
  timestamp: string;
  duration?: number; // in milliseconds
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  averageProcessingTime: number;
  errorRate: number;
  webhookSuccessRate: number;
  apiCallSuccessRate: number;
}

export interface PaymentAnalytics {
  period: string; // e.g., '24h', '7d', '30d'
  metrics: PaymentMetrics;
  topErrors: Array<{ code: string; count: number; percentage: number }>;
  performanceTrends: Array<{ timestamp: string; processingTime: number }>;
  volumeByHour: Array<{ hour: number; count: number }>;
}

/**
 * Monitoring and analytics service for ClicToPay operations
 */
@Injectable()
export class ClicToPayMonitoringService {
  private static readonly loggerCtx = 'ClicToPayMonitoringService';
  private events: PaymentEvent[] = [];
  private readonly maxEventsInMemory = 10000; // Keep last 10k events in memory

  /**
   * Log a payment event with structured data
   */
  logPaymentEvent(event: Omit<PaymentEvent, 'timestamp'>): void {
    const fullEvent: PaymentEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to in-memory storage (for demonstration - in production, use proper storage)
    this.events.push(fullEvent);
    
    // Keep only recent events in memory
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(-this.maxEventsInMemory);
    }

    // Structured logging
    this.logStructuredEvent(fullEvent);
  }

  /**
   * Track API call performance and outcome
   */
  trackApiCall(
    correlationId: string,
    endpoint: string,
    duration: number,
    success: boolean,
    errorCode?: string,
    errorMessage?: string
  ): void {
    this.logPaymentEvent({
      eventType: 'API_CALL',
      orderId: 'N/A',
      correlationId,
      duration,
      success,
      errorCode,
      errorMessage,
      metadata: { endpoint }
    });

    Logger.info(
      `[${correlationId}] API Call to ${endpoint} - Duration: ${duration}ms, Success: ${success}`,
      ClicToPayMonitoringService.loggerCtx
    );
  }

  /**
   * Track payment initiation
   */
  trackPaymentInitiated(
    orderId: string,
    correlationId: string,
    amount: number,
    currency: string
  ): void {
    this.logPaymentEvent({
      eventType: 'PAYMENT_INITIATED',
      orderId,
      correlationId,
      success: true,
      metadata: { amount, currency }
    });

    Logger.info(
      `[${correlationId}] Payment initiated for order ${orderId} - Amount: ${amount} ${currency}`,
      ClicToPayMonitoringService.loggerCtx
    );
  }

  /**
   * Track payment completion
   */
  trackPaymentCompleted(
    orderId: string,
    correlationId: string,
    transactionId: string,
    duration?: number
  ): void {
    this.logPaymentEvent({
      eventType: 'PAYMENT_COMPLETED',
      orderId,
      correlationId,
      success: true,
      duration,
      metadata: { transactionId }
    });

    Logger.info(
      `[${correlationId}] Payment completed for order ${orderId} - Transaction: ${transactionId}${duration ? `, Duration: ${duration}ms` : ''}`,
      ClicToPayMonitoringService.loggerCtx
    );
  }

  /**
   * Track payment failure
   */
  trackPaymentFailed(
    orderId: string,
    correlationId: string,
    errorCode: string,
    errorMessage: string,
    duration?: number
  ): void {
    this.logPaymentEvent({
      eventType: 'PAYMENT_FAILED',
      orderId,
      correlationId,
      success: false,
      duration,
      errorCode,
      errorMessage
    });

    Logger.warn(
      `[${correlationId}] Payment failed for order ${orderId} - Error: ${errorCode} - ${errorMessage}`,
      ClicToPayMonitoringService.loggerCtx
    );
  }

  /**
   * Track webhook reception and processing
   */
  trackWebhookReceived(
    orderId: string,
    correlationId: string,
    status: string,
    processingTime: number,
    success: boolean,
    errorMessage?: string
  ): void {
    this.logPaymentEvent({
      eventType: 'WEBHOOK_RECEIVED',
      orderId,
      correlationId,
      duration: processingTime,
      success,
      errorMessage,
      metadata: { status }
    });

    const logMessage = `[${correlationId}] Webhook processed for order ${orderId} - Status: ${status}, Processing time: ${processingTime}ms`;
    
    if (success) {
      Logger.info(logMessage, ClicToPayMonitoringService.loggerCtx);
    } else {
      Logger.error(`${logMessage} - Error: ${errorMessage}`, ClicToPayMonitoringService.loggerCtx);
    }
  }

  /**
   * Get payment metrics for a specific time period
   */
  getPaymentMetrics(periodHours: number = 24): PaymentMetrics {
    const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const relevantEvents = this.events.filter(event => 
      new Date(event.timestamp) >= cutoffTime
    );

    const paymentEvents = relevantEvents.filter(event =>
      ['PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED'].includes(event.eventType)
    );

    const webhookEvents = relevantEvents.filter(event => event.eventType === 'WEBHOOK_RECEIVED');
    const apiEvents = relevantEvents.filter(event => event.eventType === 'API_CALL');

    const totalPayments = paymentEvents.length;
    const successfulPayments = paymentEvents.filter(e => e.success).length;
    const failedPayments = totalPayments - successfulPayments;

    const processingTimes = paymentEvents
      .filter(e => e.duration)
      .map(e => e.duration!);

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    const errorRate = totalPayments > 0 ? (failedPayments / totalPayments) * 100 : 0;
    
    const webhookSuccessRate = webhookEvents.length > 0
      ? (webhookEvents.filter(e => e.success).length / webhookEvents.length) * 100
      : 100;

    const apiCallSuccessRate = apiEvents.length > 0
      ? (apiEvents.filter(e => e.success).length / apiEvents.length) * 100
      : 100;

    return {
      totalPayments,
      successfulPayments,
      failedPayments,
      averageProcessingTime: Math.round(averageProcessingTime),
      errorRate: Math.round(errorRate * 100) / 100,
      webhookSuccessRate: Math.round(webhookSuccessRate * 100) / 100,
      apiCallSuccessRate: Math.round(apiCallSuccessRate * 100) / 100,
    };
  }

  /**
   * Get detailed analytics for a time period
   */
  getPaymentAnalytics(periodHours: number = 24): PaymentAnalytics {
    const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);
    const relevantEvents = this.events.filter(event => 
      new Date(event.timestamp) >= cutoffTime
    );

    const metrics = this.getPaymentMetrics(periodHours);

    // Top errors
    const errorEvents = relevantEvents.filter(e => !e.success && e.errorCode);
    const errorCounts = errorEvents.reduce((acc, event) => {
      const code = event.errorCode!;
      acc[code] = (acc[code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalErrors = Object.values(errorCounts).reduce((sum, count) => sum + count, 0);
    const topErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({
        code,
        count,
        percentage: Math.round((count / totalErrors) * 100 * 100) / 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Performance trends (hourly averages)
    const performanceTrends = this.getHourlyPerformanceTrends(relevantEvents);

    // Volume by hour
    const volumeByHour = this.getHourlyVolume(relevantEvents);

    return {
      period: `${periodHours}h`,
      metrics,
      topErrors,
      performanceTrends,
      volumeByHour,
    };
  }

  /**
   * Check system health based on recent metrics
   */
  checkSystemHealth(): {
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    issues: string[];
    recommendations: string[];
    metrics: PaymentMetrics;
  } {
    const metrics = this.getPaymentMetrics(1); // Last hour
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    let status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    // Check error rate
    if (metrics.errorRate > 10) {
      status = 'CRITICAL';
      issues.push(`High error rate: ${metrics.errorRate}%`);
      recommendations.push('Investigate recent payment failures and API connectivity');
    } else if (metrics.errorRate > 5) {
      status = 'WARNING';
      issues.push(`Elevated error rate: ${metrics.errorRate}%`);
      recommendations.push('Monitor payment failures closely');
    }

    // Check API success rate
    if (metrics.apiCallSuccessRate < 95) {
      if (metrics.apiCallSuccessRate < 90) {
        status = 'CRITICAL';
      } else if (status === 'HEALTHY') {
        status = 'WARNING';
      }
      issues.push(`Low API success rate: ${metrics.apiCallSuccessRate}%`);
      recommendations.push('Check ClicToPay API connectivity and status');
    }

    // Check webhook success rate
    if (metrics.webhookSuccessRate < 98) {
      if (metrics.webhookSuccessRate < 95) {
        status = 'CRITICAL';
      } else if (status === 'HEALTHY') {
        status = 'WARNING';
      }
      issues.push(`Low webhook success rate: ${metrics.webhookSuccessRate}%`);
      recommendations.push('Investigate webhook processing failures');
    }

    // Check processing time
    if (metrics.averageProcessingTime > 10000) { // 10 seconds
      if (status === 'HEALTHY') {
        status = 'WARNING';
      }
      issues.push(`Slow processing time: ${metrics.averageProcessingTime}ms`);
      recommendations.push('Investigate performance bottlenecks');
    }

    if (issues.length === 0) {
      issues.push('All systems operating normally');
    }

    return { status, issues, recommendations, metrics };
  }

  /**
   * Log structured event data
   */
  private logStructuredEvent(event: PaymentEvent): void {
    const logLevel = event.success ? 'info' : 'error';
    const logData = {
      correlationId: event.correlationId,
      eventType: event.eventType,
      orderId: event.orderId,
      success: event.success,
      duration: event.duration,
      errorCode: event.errorCode,
      metadata: event.metadata,
    };

    const message = `[${event.correlationId}] ${event.eventType} - Order: ${event.orderId}, Success: ${event.success}`;

    if (logLevel === 'info') {
      Logger.info(message, ClicToPayMonitoringService.loggerCtx);
    } else {
      Logger.error(`${message} - Error: ${event.errorCode} - ${event.errorMessage}`, ClicToPayMonitoringService.loggerCtx);
    }
  }

  /**
   * Get hourly performance trends
   */
  private getHourlyPerformanceTrends(events: PaymentEvent[]): Array<{ timestamp: string; processingTime: number }> {
    const hourlyData: Record<string, number[]> = {};
    
    events
      .filter(e => e.duration && e.success)
      .forEach(event => {
        const hour = new Date(event.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
        if (!hourlyData[hour]) {
          hourlyData[hour] = [];
        }
        hourlyData[hour].push(event.duration!);
      });

    return Object.entries(hourlyData)
      .map(([timestamp, times]) => ({
        timestamp,
        processingTime: Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Get hourly payment volume
   */
  private getHourlyVolume(events: PaymentEvent[]): Array<{ hour: number; count: number }> {
    const hourCounts: Record<number, number> = {};
    
    // Initialize all hours to 0
    for (let hour = 0; hour < 24; hour++) {
      hourCounts[hour] = 0;
    }

    events
      .filter(e => e.eventType === 'PAYMENT_INITIATED')
      .forEach(event => {
        const hour = new Date(event.timestamp).getHours();
        hourCounts[hour]++;
      });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => a.hour - b.hour);
  }
}