/**
 * ClicToPay API Types
 * 
 * Defines types for ClicToPay API requests, responses, and related data structures.
 * Based on ClicToPay's API documentation and payment flow requirements.
 */

import { ID } from '@vendure/core';

/**
 * Payment status enum matching ClicToPay's status values
 */
export enum ClicToPaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  SETTLED = 'SETTLED',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  REFUNDED = 'REFUNDED',
}

/**
 * Payment registration request to ClicToPay register.do endpoint
 */
export interface ClicToPayRegisterRequest {
  /** Merchant username */
  userName: string;
  
  /** Merchant password */
  password: string;
  
  /** Order total amount in cents */
  amount: number;
  
  /** Currency code (e.g., '788' for TND, 'EUR', 'USD') */
  currency: string;
  
  /** Language code ('en', 'fr', 'ar') - Required by ClicToPay */
  language: string;
  
  /** Unique order reference from Vendure */
  orderNumber: string;
  
  /** Customer return URL after successful payment */
  returnUrl: string;
  
  /** Customer return URL after failed payment */
  failUrl: string;
  
  /** Optional webhook URL for payment status updates */
  callbackUrl?: string;
  
  /** Order description */
  description?: string;
  
  /** Customer email address */
  clientId?: string;
  
  /** Additional metadata */
  jsonParams?: string;
  
  /** Session timeout in minutes */
  sessionTimeoutSecs?: number;
  
  /** Page view type (WEB, MOBILE, etc.) */
  pageView?: string;
}

/**
 * Response from ClicToPay register.do endpoint
 */
export interface ClicToPayRegisterResponse {
  /** Registration ID from ClicToPay */
  orderId: string;
  
  /** URL to redirect customer for payment */
  formUrl: string;
  
  /** Error code (0 = success) */
  errorCode: string;
  
  /** Error message if registration failed */
  errorMessage?: string;
}

/**
 * Order status request to ClicToPay getOrderStatus.do endpoint
 */
export interface ClicToPayStatusRequest {
  /** Merchant username */
  userName: string;
  
  /** Merchant password */
  password: string;
  
  /** ClicToPay order ID from registration response */
  orderId: string;
  
  /** Optional: Original order number for validation */
  orderNumber?: string;
}

/**
 * Response from ClicToPay getOrderStatus.do endpoint
 */
export interface ClicToPayStatusResponse {
  /** Order status */
  orderStatus: ClicToPaymentStatus;
  
  /** Error code (0 = success) */
  errorCode: string;
  
  /** Error message if status check failed */
  errorMessage?: string;
  
  /** ClicToPay order ID */
  orderId?: string;
  
  /** Payment amount in cents */
  amount?: number;
  
  /** Currency code */
  currency?: string;
  
  /** Original order number */
  orderNumber?: string;
  
  /** Payment date/time */
  date?: string;
  
  /** Transaction reference */
  rrn?: string;
  
  /** Authorization code */
  authCode?: string;
  
  /** Card mask (last 4 digits) */
  cardholderName?: string;
  
  /** Customer IP address */
  ip?: string;
  
  /** Deposit date */
  depositedDate?: string;
  
  /** Authorization reference number */
  authRefNum?: string;
  
  /** Binding ID */
  bindingId?: string;
  
  /** Authorization date/time timestamp */
  authDateTime?: number;
  
  /** Terminal ID */
  terminalId?: string;
  
  /** Additional payment details */
  additionalInfo?: Record<string, any>;
}

/**
 * Webhook payload from ClicToPay
 */
export interface ClicToPayWebhookPayload {
  /** ClicToPay order ID */
  orderId: string;
  
  /** Payment status */
  status: ClicToPaymentStatus;
  
  /** Original order number */
  orderNumber: string;
  
  /** Payment amount */
  amount: number;
  
  /** Currency code */
  currency: string;
  
  /** Transaction timestamp */
  timestamp: string;
  
  /** Checksum for verification */
  checksum?: string;
  
  /** Additional webhook data */
  [key: string]: any;
}

/**
 * Internal payment data stored in Vendure payment metadata
 */
export interface ClicToPayPaymentMetadata {
  /** ClicToPay registration ID */
  clicToPayOrderId: string;
  
  /** Original registration request */
  registrationRequest: ClicToPayRegisterRequest;
  
  /** Registration response */
  registrationResponse: ClicToPayRegisterResponse;
  
  /** Payment status history */
  statusHistory: Array<{
    status: ClicToPaymentStatus;
    timestamp: string;
    source: 'webhook' | 'status_check' | 'manual';
  }>;
  
  /** Last status check timestamp */
  lastStatusCheck?: string;
  
  /** Number of retry attempts */
  retryCount: number;
  
  /** Test mode flag */
  testMode: boolean;
}

/**
 * Payment creation result
 */
export interface CreatePaymentResult {
  /** Success flag */
  success: boolean;
  
  /** ClicToPay order ID */
  clicToPayOrderId?: string;
  
  /** Redirect URL for customer */
  redirectUrl?: string;
  
  /** Error message if creation failed */
  errorMessage?: string;
  
  /** Error code */
  errorCode?: string;
}

/**
 * Payment status check result
 */
export interface PaymentStatusResult {
  /** Current payment status */
  status: ClicToPaymentStatus;
  
  /** Whether status check was successful */
  success: boolean;
  
  /** Error message if check failed */
  errorMessage?: string;
  
  /** Raw API response */
  rawResponse?: ClicToPayStatusResponse;
}

/**
 * API error response structure
 */
export interface ClicToPayApiError {
  /** Error code */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Additional error details */
  details?: Record<string, any>;
  
  /** Original API response */
  originalResponse?: any;
}

/**
 * Currency configuration
 */
export interface CurrencyConfig {
  /** ISO currency code */
  code: string;
  
  /** Decimal places for the currency */
  decimalPlaces: number;
  
  /** Whether currency is supported by ClicToPay */
  supported: boolean;
}

/**
 * Supported currencies with their configurations
 */
export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  EUR: { code: 'EUR', decimalPlaces: 2, supported: true },
  USD: { code: 'USD', decimalPlaces: 2, supported: true },
  GBP: { code: 'GBP', decimalPlaces: 2, supported: true },
  MAD: { code: 'MAD', decimalPlaces: 2, supported: true },
  TND: { code: '788', decimalPlaces: 3, supported: true }, // Tunisian Dinar (ClicToPay uses ISO numeric code)
};

/**
 * API timeout and retry configuration
 */
export interface ApiRequestConfig {
  /** Request timeout in milliseconds */
  timeout: number;
  
  /** Number of retry attempts */
  retries: number;
  
  /** Base delay between retries in milliseconds */
  retryDelay: number;
  
  /** Whether to use exponential backoff */
  exponentialBackoff: boolean;
}