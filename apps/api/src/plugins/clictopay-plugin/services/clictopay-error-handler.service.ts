import { Injectable } from '@nestjs/common';
import { Logger } from '@vendure/core';

export enum ClicToPayErrorCode {
  // Configuration Errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_CREDENTIALS = 'MISSING_CREDENTIALS',
  CONFIG_VALIDATION_FAILED = 'CONFIG_VALIDATION_FAILED',
  
  // API Communication Errors
  API_TIMEOUT = 'API_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  
  // Payment Processing Errors
  PAYMENT_REGISTRATION_FAILED = 'PAYMENT_REGISTRATION_FAILED',
  PAYMENT_STATUS_CHECK_FAILED = 'PAYMENT_STATUS_CHECK_FAILED',
  PAYMENT_SETTLEMENT_FAILED = 'PAYMENT_SETTLEMENT_FAILED',
  PAYMENT_CANCELLATION_FAILED = 'PAYMENT_CANCELLATION_FAILED',
  
  // Business Logic Errors
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  INVALID_ORDER_STATE = 'INVALID_ORDER_STATE',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  CURRENCY_NOT_SUPPORTED = 'CURRENCY_NOT_SUPPORTED',
  
  // Webhook Errors
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  WEBHOOK_TIMESTAMP_INVALID = 'WEBHOOK_TIMESTAMP_INVALID',
  WEBHOOK_PAYLOAD_INVALID = 'WEBHOOK_PAYLOAD_INVALID',
  
  // Security Errors
  UNAUTHORIZED_REQUEST = 'UNAUTHORIZED_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ClicToPayError {
  code: ClicToPayErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
  correlationId?: string;
  timestamp: string;
}

export interface ErrorRecoveryAction {
  action: 'RETRY' | 'FALLBACK' | 'NOTIFY_ADMIN' | 'CANCEL_PAYMENT' | 'MANUAL_REVIEW';
  description: string;
  automated: boolean;
}

/**
 * Comprehensive error handling service for ClicToPay operations
 */
@Injectable()
export class ClicToPayErrorHandlerService {
  private static readonly loggerCtx = 'ClicToPayErrorHandlerService';

  /**
   * Create a structured ClicToPay error
   */
  createError(
    code: ClicToPayErrorCode,
    message: string,
    details?: any,
    correlationId?: string
  ): ClicToPayError {
    const errorInfo = this.getErrorInfo(code);
    
    return {
      code,
      message,
      details,
      retryable: errorInfo.retryable,
      userMessage: errorInfo.userMessage,
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle and categorize different types of errors
   */
  handleError(error: unknown, correlationId?: string): ClicToPayError {
    Logger.error(
      `Handling error in ClicToPay operation - ${correlationId || 'N/A'}`,
      ClicToPayErrorHandlerService.loggerCtx
    );

    if (error instanceof Error) {
      // Check for specific error types
      if (error.name === 'AxiosError') {
        return this.handleNetworkError(error, correlationId);
      }
      
      if (error.message.includes('timeout')) {
        return this.createError(
          ClicToPayErrorCode.API_TIMEOUT,
          'API request timed out',
          { originalError: error.message },
          correlationId
        );
      }
      
      if (error.message.includes('Network Error')) {
        return this.createError(
          ClicToPayErrorCode.NETWORK_ERROR,
          'Network connectivity issue',
          { originalError: error.message },
          correlationId
        );
      }
    }

    // Generic error handling
    return this.createError(
      ClicToPayErrorCode.UNKNOWN_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      { originalError: error },
      correlationId
    );
  }

  /**
   * Handle network-related errors specifically
   */
  private handleNetworkError(error: Error, correlationId?: string): ClicToPayError {
    const axiosError = error as any;
    
    if (axiosError.response) {
      const status = axiosError.response.status;
      
      if (status >= 400 && status < 500) {
        return this.createError(
          ClicToPayErrorCode.HTTP_ERROR,
          `HTTP client error: ${status}`,
          { status, response: axiosError.response.data },
          correlationId
        );
      }
      
      if (status >= 500) {
        return this.createError(
          ClicToPayErrorCode.API_UNAVAILABLE,
          `ClicToPay API server error: ${status}`,
          { status, response: axiosError.response.data },
          correlationId
        );
      }
    }
    
    if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
      return this.createError(
        ClicToPayErrorCode.API_UNAVAILABLE,
        'ClicToPay API is unreachable',
        { code: axiosError.code },
        correlationId
      );
    }
    
    return this.createError(
      ClicToPayErrorCode.NETWORK_ERROR,
      'Network error occurred',
      { originalError: error.message },
      correlationId
    );
  }

  /**
   * Determine recovery actions for different error types
   */
  getRecoveryActions(error: ClicToPayError): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];
    
    switch (error.code) {
      case ClicToPayErrorCode.API_TIMEOUT:
      case ClicToPayErrorCode.NETWORK_ERROR:
      case ClicToPayErrorCode.API_UNAVAILABLE:
        actions.push({
          action: 'RETRY',
          description: 'Automatically retry the request with exponential backoff',
          automated: true,
        });
        break;
        
      case ClicToPayErrorCode.PAYMENT_REGISTRATION_FAILED:
      case ClicToPayErrorCode.PAYMENT_STATUS_CHECK_FAILED:
        actions.push(
          {
            action: 'RETRY',
            description: 'Retry payment operation',
            automated: true,
          },
          {
            action: 'FALLBACK',
            description: 'Fallback to alternative payment method (COD)',
            automated: false,
          }
        );
        break;
        
      case ClicToPayErrorCode.WEBHOOK_SIGNATURE_INVALID:
      case ClicToPayErrorCode.UNAUTHORIZED_REQUEST:
        actions.push({
          action: 'NOTIFY_ADMIN',
          description: 'Security issue detected - notify system administrator',
          automated: true,
        });
        break;
        
      case ClicToPayErrorCode.ORDER_NOT_FOUND:
      case ClicToPayErrorCode.PAYMENT_NOT_FOUND:
        actions.push({
          action: 'MANUAL_REVIEW',
          description: 'Manual review required - data consistency issue',
          automated: false,
        });
        break;
        
      case ClicToPayErrorCode.PAYMENT_SETTLEMENT_FAILED:
      case ClicToPayErrorCode.PAYMENT_CANCELLATION_FAILED:
        actions.push(
          {
            action: 'RETRY',
            description: 'Retry payment state change',
            automated: true,
          },
          {
            action: 'MANUAL_REVIEW',
            description: 'Manual review if automatic retry fails',
            automated: false,
          }
        );
        break;
        
      default:
        actions.push({
          action: 'MANUAL_REVIEW',
          description: 'Manual investigation required',
          automated: false,
        });
    }
    
    return actions;
  }

  /**
   * Check if an error is retryable
   */
  isRetryable(error: ClicToPayError): boolean {
    return error.retryable;
  }

  /**
   * Log error with appropriate level and context
   */
  logError(error: ClicToPayError, context?: string): void {
    const logContext = context || ClicToPayErrorHandlerService.loggerCtx;
    
    const logMessage = `[${error.correlationId}] ${error.code}: ${error.message}`;
    
    // Determine log level based on error severity
    switch (error.code) {
      case ClicToPayErrorCode.WEBHOOK_SIGNATURE_INVALID:
      case ClicToPayErrorCode.UNAUTHORIZED_REQUEST:
        Logger.error(`SECURITY ALERT: ${logMessage}`, logContext);
        break;
        
      case ClicToPayErrorCode.PAYMENT_SETTLEMENT_FAILED:
      case ClicToPayErrorCode.PAYMENT_CANCELLATION_FAILED:
        Logger.error(`CRITICAL: ${logMessage}`, logContext);
        break;
        
      case ClicToPayErrorCode.API_TIMEOUT:
      case ClicToPayErrorCode.NETWORK_ERROR:
        Logger.warn(`RETRY NEEDED: ${logMessage}`, logContext);
        break;
        
      default:
        Logger.error(logMessage, logContext);
    }
  }

  /**
   * Get error information including user-friendly messages
   */
  private getErrorInfo(code: ClicToPayErrorCode): { retryable: boolean; userMessage: string } {
    const errorMap: Record<ClicToPayErrorCode, { retryable: boolean; userMessage: string }> = {
      [ClicToPayErrorCode.INVALID_CONFIG]: {
        retryable: false,
        userMessage: 'Payment configuration error. Please contact support.',
      },
      [ClicToPayErrorCode.MISSING_CREDENTIALS]: {
        retryable: false,
        userMessage: 'Payment system configuration issue. Please contact support.',
      },
      [ClicToPayErrorCode.CONFIG_VALIDATION_FAILED]: {
        retryable: false,
        userMessage: 'Payment configuration error. Please contact support.',
      },
      [ClicToPayErrorCode.API_TIMEOUT]: {
        retryable: true,
        userMessage: 'Payment service is temporarily slow. Please try again.',
      },
      [ClicToPayErrorCode.NETWORK_ERROR]: {
        retryable: true,
        userMessage: 'Connection issue with payment service. Please try again.',
      },
      [ClicToPayErrorCode.HTTP_ERROR]: {
        retryable: false,
        userMessage: 'Payment request error. Please try again or contact support.',
      },
      [ClicToPayErrorCode.API_UNAVAILABLE]: {
        retryable: true,
        userMessage: 'Payment service is temporarily unavailable. Please try again later.',
      },
      [ClicToPayErrorCode.PAYMENT_REGISTRATION_FAILED]: {
        retryable: true,
        userMessage: 'Unable to start payment process. Please try again.',
      },
      [ClicToPayErrorCode.PAYMENT_STATUS_CHECK_FAILED]: {
        retryable: true,
        userMessage: 'Unable to check payment status. Please try again.',
      },
      [ClicToPayErrorCode.PAYMENT_SETTLEMENT_FAILED]: {
        retryable: true,
        userMessage: 'Payment processing issue. Please contact support if this persists.',
      },
      [ClicToPayErrorCode.PAYMENT_CANCELLATION_FAILED]: {
        retryable: true,
        userMessage: 'Unable to cancel payment. Please contact support.',
      },
      [ClicToPayErrorCode.ORDER_NOT_FOUND]: {
        retryable: false,
        userMessage: 'Order not found. Please check your order details.',
      },
      [ClicToPayErrorCode.PAYMENT_NOT_FOUND]: {
        retryable: false,
        userMessage: 'Payment record not found. Please contact support.',
      },
      [ClicToPayErrorCode.INVALID_ORDER_STATE]: {
        retryable: false,
        userMessage: 'Order is not in a valid state for this operation.',
      },
      [ClicToPayErrorCode.AMOUNT_MISMATCH]: {
        retryable: false,
        userMessage: 'Payment amount does not match order total. Please try again.',
      },
      [ClicToPayErrorCode.CURRENCY_NOT_SUPPORTED]: {
        retryable: false,
        userMessage: 'Currency not supported for this payment method.',
      },
      [ClicToPayErrorCode.WEBHOOK_SIGNATURE_INVALID]: {
        retryable: false,
        userMessage: 'Payment verification failed. Please contact support.',
      },
      [ClicToPayErrorCode.WEBHOOK_TIMESTAMP_INVALID]: {
        retryable: false,
        userMessage: 'Payment notification expired. Please contact support.',
      },
      [ClicToPayErrorCode.WEBHOOK_PAYLOAD_INVALID]: {
        retryable: false,
        userMessage: 'Invalid payment notification. Please contact support.',
      },
      [ClicToPayErrorCode.UNAUTHORIZED_REQUEST]: {
        retryable: false,
        userMessage: 'Unauthorized request. Please contact support.',
      },
      [ClicToPayErrorCode.RATE_LIMIT_EXCEEDED]: {
        retryable: true,
        userMessage: 'Too many requests. Please wait a moment and try again.',
      },
      [ClicToPayErrorCode.INTERNAL_ERROR]: {
        retryable: false,
        userMessage: 'Internal error occurred. Please contact support.',
      },
      [ClicToPayErrorCode.DATABASE_ERROR]: {
        retryable: true,
        userMessage: 'Database error. Please try again or contact support.',
      },
      [ClicToPayErrorCode.UNKNOWN_ERROR]: {
        retryable: false,
        userMessage: 'An unexpected error occurred. Please contact support.',
      },
    };
    
    return errorMap[code] || {
      retryable: false,
      userMessage: 'An error occurred. Please contact support.',
    };
  }
}