/**
 * ClicToPay Plugin Configuration Types
 * 
 * Defines the configuration interface and related types for the ClicToPay payment gateway plugin.
 * Used for admin configuration, plugin initialization, and type safety throughout the plugin.
 */

/**
 * Main configuration interface for ClicToPay plugin
 * These settings are configurable from the Vendure Admin UI
 */
export interface ClicToPayConfig {
  /** Whether the ClicToPay payment method is enabled */
  enabled: boolean;
  
  /** Display title shown to customers at checkout */
  title: string;
  
  /** Description shown to customers for this payment method */
  description: string;
  
  /** Whether to use ClicToPay's test/sandbox environment */
  testMode: boolean;
  
  /** ClicToPay username for API authentication */
  username: string;
  
  /** ClicToPay password for API authentication */
  password: string;
  
  /** Base URL for ClicToPay API (different for test/prod) */
  apiUrl: string;
  
  /** API request timeout in milliseconds */
  timeout: number;
  
  /** Number of retry attempts for failed API calls */
  retryAttempts: number;
  
  /** Secret key for webhook authentication */
  webhookSecret: string;
  
  /** Optional logo URL for payment method display */
  logoUrl?: string;
}

/**
 * Default configuration values
 */
export const defaultClicToPayConfig: ClicToPayConfig = {
  enabled: false,
  title: 'ClicToPay',
  description: 'Pay securely with ClicToPay payment gateway',
  testMode: true,
  username: '',
  password: '',
  apiUrl: 'https://test.clictopay.com/payment/rest', // Default test URL
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  webhookSecret: '',
  logoUrl: undefined,
};

/**
 * Plugin initialization options
 */
export interface ClicToPayPluginOptions {
  /** Initial configuration (can be overridden in admin UI) */
  config?: Partial<ClicToPayConfig>;
  
  /** Whether to enable debug logging */
  enableDebugLogging?: boolean;
  
  /** Custom webhook endpoint path (defaults to '/clictopay/webhook') */
  webhookPath?: string;
}

/**
 * Environment-specific API URLs
 */
export const CLICTOPAY_API_URLS = {
  test: 'https://test.clictopay.com/payment/rest',
  production: 'https://clictopay.com/payment/rest', // Update when production URL is confirmed
} as const;

/**
 * ClicToPay API endpoints
 */
export const CLICTOPAY_ENDPOINTS = {
  register: '/register.do',
  status: '/getOrderStatus.do',
  webhook: '/webhook',
} as const;

/**
 * Configuration validation schema
 */
export interface ClicToPayConfigValidation {
  field: keyof ClicToPayConfig;
  required: boolean;
  type: 'string' | 'boolean' | 'number';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

/**
 * Validation rules for configuration fields
 */
export const CONFIG_VALIDATION_RULES: ClicToPayConfigValidation[] = [
  { field: 'enabled', required: true, type: 'boolean' },
  { field: 'title', required: true, type: 'string', minLength: 1, maxLength: 100 },
  { field: 'description', required: true, type: 'string', minLength: 1, maxLength: 500 },
  { field: 'testMode', required: true, type: 'boolean' },
  { field: 'username', required: true, type: 'string', minLength: 3, maxLength: 100 },
  { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 100 },
  { field: 'apiUrl', required: true, type: 'string', minLength: 10, maxLength: 500 },
  { field: 'timeout', required: true, type: 'number', min: 5000, max: 120000 },
  { field: 'retryAttempts', required: true, type: 'number', min: 0, max: 10 },
  { field: 'webhookSecret', required: false, type: 'string', maxLength: 200 },
];