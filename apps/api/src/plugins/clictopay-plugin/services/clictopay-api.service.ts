import { Injectable } from '@nestjs/common';
import { Logger } from '@vendure/core';
import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  ClicToPayRegisterRequest,
  ClicToPayRegisterResponse,
  ClicToPayStatusRequest,
  ClicToPayStatusResponse,
  CreatePaymentResult,
  PaymentStatusResult,
  ClicToPayApiError,
  ClicToPaymentStatus,
  ApiRequestConfig,
} from '../types/clictopay-api.types';
import { ClicToPayConfig, CLICTOPAY_ENDPOINTS } from '../types/clictopay-config.types';

/**
 * ClicToPay API Service
 * 
 * Handles all communication with ClicToPay payment gateway API.
 * Includes payment registration, status checks, error handling, and retry logic.
 */
@Injectable()
export class ClicToPayApiService {
  private static readonly loggerCtx = 'ClicToPayApiService';

  constructor() {}

  /**
   * Register a new payment with ClicToPay
   * Calls the register.do endpoint to create a payment session
   */
  async registerPayment(
    config: ClicToPayConfig,
    request: ClicToPayRegisterRequest
  ): Promise<CreatePaymentResult> {
    const endpoint = `${config.apiUrl}${CLICTOPAY_ENDPOINTS.register}`;
    
    Logger.info(
      `Registering payment with ClicToPay - Order: ${request.orderNumber}, Amount: ${request.amount} ${request.currency}`,
      ClicToPayApiService.loggerCtx
    );
    
    Logger.debug(
      `ClicToPay API Request Details - Endpoint: ${endpoint}, Username: ${request.userName}, TestMode: ${config.testMode}`,
      ClicToPayApiService.loggerCtx
    );

    try {
      const response = await this.makeApiRequest<ClicToPayRegisterResponse>(
        endpoint,
        request,
        {
          timeout: config.timeout,
          retries: config.retryAttempts,
          retryDelay: 1000,
          exponentialBackoff: true,
        }
      );

      // Check if registration was successful
      if (response.errorCode === '0') {
        Logger.info(
          `Payment registration successful - ClicToPay Order ID: ${response.orderId}`,
          ClicToPayApiService.loggerCtx
        );

        return {
          success: true,
          clicToPayOrderId: response.orderId,
          redirectUrl: response.formUrl,
        };
      } else {
        Logger.error(
          `Payment registration failed - Error: ${response.errorCode} - ${response.errorMessage}`,
          ClicToPayApiService.loggerCtx
        );

        return {
          success: false,
          errorCode: response.errorCode,
          errorMessage: response.errorMessage || 'Unknown registration error',
        };
      }
    } catch (error) {
      const apiError = this.handleApiError(error);
      Logger.error(
        `Payment registration API call failed - ${apiError.message}`,
        ClicToPayApiService.loggerCtx
      );

      return {
        success: false,
        errorCode: apiError.code,
        errorMessage: apiError.message,
      };
    }
  }

  /**
   * Check payment status with ClicToPay
   * Calls the getOrderStatus.do endpoint to get current payment status
   */
  async checkPaymentStatus(
    config: ClicToPayConfig,
    clicToPayOrderId: string,
    originalOrderNumber?: string
  ): Promise<PaymentStatusResult> {
    const endpoint = `${config.apiUrl}${CLICTOPAY_ENDPOINTS.status}`;
    
    const request: ClicToPayStatusRequest = {
      userName: config.username,
      password: config.password,
      orderId: clicToPayOrderId,
      orderNumber: originalOrderNumber,
    };

    Logger.debug(
      `Checking payment status - ClicToPay Order ID: ${clicToPayOrderId}`,
      ClicToPayApiService.loggerCtx
    );

    try {
      const response = await this.makeApiRequest<ClicToPayStatusResponse>(
        endpoint,
        request,
        {
          timeout: config.timeout,
          retries: Math.min(config.retryAttempts, 2), // Fewer retries for status checks
          retryDelay: 500,
          exponentialBackoff: false,
        }
      );

      if (response.errorCode === '0') {
        Logger.debug(
          `Payment status check successful - Status: ${response.orderStatus}`,
          ClicToPayApiService.loggerCtx
        );

        return {
          success: true,
          status: response.orderStatus,
          rawResponse: response,
        };
      } else {
        Logger.error(
          `Payment status check failed - Error: ${response.errorCode} - ${response.errorMessage}`,
          ClicToPayApiService.loggerCtx
        );

        return {
          success: false,
          status: ClicToPaymentStatus.FAILED,
          errorMessage: response.errorMessage || 'Unknown status check error',
        };
      }
    } catch (error) {
      const apiError = this.handleApiError(error);
      Logger.error(
        `Payment status check API call failed - ${apiError.message}`,
        ClicToPayApiService.loggerCtx
      );

      return {
        success: false,
        status: ClicToPaymentStatus.FAILED,
        errorMessage: apiError.message,
      };
    }
  }

  /**
   * Make HTTP request to ClicToPay API with retry logic
   */
  private async makeApiRequest<T>(
    url: string,
    data: any,
    config: ApiRequestConfig
  ): Promise<T> {
    let lastError: Error | null = null;
    
    Logger.debug(
      `Making ClicToPay API request to: ${url}`,
      ClicToPayApiService.loggerCtx
    );
    Logger.debug(
      `Request data: ${JSON.stringify(data, null, 2)}`,
      ClicToPayApiService.loggerCtx
    );
    
    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        const response: AxiosResponse<T> = await axios.post(url, data, {
          timeout: config.timeout,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'Vendure-ClicToPay/1.0',
          },
          transformRequest: [(data: any) => {
            // Convert object to form URL-encoded string
            const formData = Object.keys(data)
              .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key] || '')}`)
              .join('&');
            Logger.debug(
              `Form data being sent: ${formData}`,
              ClicToPayApiService.loggerCtx
            );
            return formData;
          }],
        });

        Logger.debug(
          `ClicToPay API response status: ${response.status}`,
          ClicToPayApiService.loggerCtx
        );
        Logger.debug(
          `ClicToPay API response data: ${JSON.stringify(response.data, null, 2)}`,
          ClicToPayApiService.loggerCtx
        );

        return response.data;
      } catch (error) {
        lastError = error as Error;
        
        // Log detailed error information
        if (axios.isAxiosError(error)) {
          const axiosErr = error as AxiosError;
          Logger.error(
            `ClicToPay API request attempt ${attempt + 1} failed with Axios error:`,
            ClicToPayApiService.loggerCtx
          );
          Logger.error(
            `- URL: ${url}`,
            ClicToPayApiService.loggerCtx
          );
          Logger.error(
            `- Status: ${axiosErr.response?.status || 'No response'}`,
            ClicToPayApiService.loggerCtx
          );
          Logger.error(
            `- Status Text: ${axiosErr.response?.statusText || 'No response'}`,
            ClicToPayApiService.loggerCtx
          );
          Logger.error(
            `- Response Data: ${JSON.stringify(axiosErr.response?.data, null, 2) || 'No response data'}`,
            ClicToPayApiService.loggerCtx
          );
          Logger.error(
            `- Error Code: ${axiosErr.code || 'No error code'}`,
            ClicToPayApiService.loggerCtx
          );
          Logger.error(
            `- Error Message: ${axiosErr.message}`,
            ClicToPayApiService.loggerCtx
          );
        } else {
          Logger.error(
            `ClicToPay API request attempt ${attempt + 1} failed with non-Axios error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ClicToPayApiService.loggerCtx
          );
        }
        
        // Don't retry on client errors (4xx)
        if (axios.isAxiosError(error)) {
          const axiosErr = error as AxiosError;
          if (axiosErr.response?.status && axiosErr.response.status < 500) {
            Logger.error(
              `Client error (${axiosErr.response.status}), will not retry`,
              ClicToPayApiService.loggerCtx
            );
            break;
          }
        }

        // Calculate delay for next attempt
        if (attempt < config.retries) {
          const delay = config.exponentialBackoff 
            ? config.retryDelay * Math.pow(2, attempt)
            : config.retryDelay;
          
          Logger.warn(
            `API request attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
            ClicToPayApiService.loggerCtx
          );

          await this.sleep(delay);
        } else {
          Logger.error(
            `All ${config.retries + 1} attempts failed, giving up`,
            ClicToPayApiService.loggerCtx
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Handle API errors and convert to standardized format
   */
  private handleApiError(error: unknown): ClicToPayApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // Server responded with error status
        return {
          code: `HTTP_${axiosError.response.status}`,
          message: `API request failed with status ${axiosError.response.status}: ${axiosError.response.statusText}`,
          details: {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            data: axiosError.response.data,
          },
          originalResponse: axiosError.response.data,
        };
      } else if (axiosError.request) {
        // Request was made but no response received
        return {
          code: 'NETWORK_ERROR',
          message: 'No response received from ClicToPay API - network error or timeout',
          details: {
            code: axiosError.code,
            message: axiosError.message,
          },
        };
      } else {
        // Error in setting up the request
        return {
          code: 'REQUEST_SETUP_ERROR',
          message: `Error setting up API request: ${axiosError.message}`,
          details: {
            message: axiosError.message,
          },
        };
      }
    }

    // Generic error handling
    const genericError = error as Error;
    return {
      code: 'UNKNOWN_ERROR',
      message: genericError.message || 'Unknown API error occurred',
      details: {
        name: genericError.name,
        message: genericError.message,
        stack: genericError.stack,
      },
    };
  }

  /**
   * Utility function to sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate ClicToPay API response format
   */
  private validateApiResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      'errorCode' in response
    );
  }

  /**
   * Build return URL for customer redirects
   */
  buildReturnUrl(baseUrl: string, orderCode: string, success: boolean): string {
    const path = success ? '/payment/success' : '/payment/failure';
    return `${baseUrl}${path}?order=${encodeURIComponent(orderCode)}`;
  }

  /**
   * Build webhook URL for payment status notifications
   */
  buildWebhookUrl(baseUrl: string, webhookPath: string = '/clictopay/webhook'): string {
    return `${baseUrl}${webhookPath}`;
  }
}