import { PluginCommonModule, VendurePlugin, LanguageCode } from '@vendure/core';
import { ClicToPayApiService } from './services/clictopay-api.service';
import { ClicToPayConfigService } from './services/clictopay-config.service';
import { ClicToPayWebhookController } from './controllers/clictopay-webhook.controller';
import { clicToPayPaymentHandler } from './handlers/clictopay-payment-handler';
import { ClicToPayPluginOptions, defaultClicToPayConfig } from './types/clictopay-config.types';

/**
 * ClicToPay Payment Gateway Plugin for Vendure
 * 
 * This plugin integrates ClicToPay payment gateway with Vendure e-commerce platform.
 * It provides a complete payment solution with webhook support, configuration management,
 * and proper error handling.
 * 
 * Features:
 * - Payment registration with ClicToPay API
 * - Webhook handling for payment status updates
 * - Configurable settings via Vendure Admin UI
 * - Test mode support for development
 * - Multi-currency support
 * - Comprehensive logging and error handling
 * 
 * Usage:
 * ```typescript
 * import { ClicToPayPlugin } from './plugins/clictopay-plugin';
 * 
 * // In your vendure-config.ts
 * plugins: [
 *   ClicToPayPlugin.init({
 *     config: {
 *       enabled: true,
 *       testMode: true,
 *       username: 'your-username',
 *       password: 'your-password',
 *     },
 *   }),
 * ]
 * ```
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  compatibility: '^3.5.0',
  
  // Register services
  providers: [
    ClicToPayApiService,
    ClicToPayConfigService,
  ],
  
  // Register controllers for webhook handling
  controllers: [ClicToPayWebhookController],
  
  // No custom entities needed for basic implementation
  entities: [],
  
  // Configure payment method handler
  configuration: config => {
    // Add ClicToPay payment method handler to the payment options
    config.paymentOptions.paymentMethodHandlers = [
      ...(config.paymentOptions.paymentMethodHandlers || []),
      clicToPayPaymentHandler,
    ];

    // Add webhook endpoint configuration
    // Ensure middleware array exists and add webhook middleware
    if (config.apiOptions && config.apiOptions.middleware) {
      config.apiOptions.middleware.push({
        handler: (req: any, res: any, next: any) => {
          // Add raw body parsing for webhook signature validation
          if (req.path?.includes('/clictopay/webhook')) {
            req.rawBody = '';
            req.on('data', (chunk: any) => {
              req.rawBody += chunk;
            });
          }
          next();
        },
        route: '/clictopay/webhook',
      });
    }

    return config;
  },
})
export class ClicToPayPlugin {
  
  /**
   * Initialize the ClicToPay plugin with configuration options
   */
  static init(options: ClicToPayPluginOptions = {}): typeof ClicToPayPlugin {
    // Store initialization options for use during plugin setup
    ClicToPayPlugin.options = options;
    return ClicToPayPlugin;
  }

  // Static property to store initialization options
  private static options: ClicToPayPluginOptions;

  /**
   * Get plugin initialization options
   */
  static getOptions(): ClicToPayPluginOptions {
    return ClicToPayPlugin.options || {};
  }

  /**
   * Get plugin configuration with defaults applied
   */
  static getConfig() {
    const options = ClicToPayPlugin.getOptions();
    return {
      ...defaultClicToPayConfig,
      ...(options.config || {}),
    };
  }

  /**
   * Check if debug logging is enabled
   */
  static isDebugEnabled(): boolean {
    return ClicToPayPlugin.getOptions().enableDebugLogging ?? false;
  }

  /**
   * Get custom webhook path
   */
  static getWebhookPath(): string {
    return ClicToPayPlugin.getOptions().webhookPath || '/clictopay/webhook';
  }
}

// Export types and constants for external use
export * from './types/clictopay-config.types';
export * from './types/clictopay-api.types';
export { ClicToPayApiService } from './services/clictopay-api.service';
export { ClicToPayConfigService } from './services/clictopay-config.service';
export { clicToPayPaymentHandler } from './handlers/clictopay-payment-handler';

// Plugin version and metadata
export const CLICTOPAY_PLUGIN_VERSION = '1.0.0';
export const CLICTOPAY_PLUGIN_NAME = 'ClicToPay Payment Gateway';
export const CLICTOPAY_PLUGIN_DESCRIPTION = 'ClicToPay payment gateway integration for Vendure e-commerce platform';

/**
 * Plugin configuration validator
 * Ensures required configuration is provided
 */
export function validateClicToPayConfiguration(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config) {
    errors.push('ClicToPay configuration is required');
    return { valid: false, errors };
  }

  // Check required fields for enabled plugin
  if (config.enabled) {
    if (!config.username || typeof config.username !== 'string') {
      errors.push('Username is required when ClicToPay is enabled');
    }

    if (!config.password || typeof config.password !== 'string') {
      errors.push('Password is required when ClicToPay is enabled');
    }

    if (!config.apiUrl || typeof config.apiUrl !== 'string') {
      errors.push('API URL is required when ClicToPay is enabled');
    }
  }

  // Validate data types
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }

  if (config.testMode !== undefined && typeof config.testMode !== 'boolean') {
    errors.push('testMode must be a boolean');
  }

  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
    errors.push('timeout must be a number greater than 1000ms');
  }

  if (config.retryAttempts !== undefined && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
    errors.push('retryAttempts must be a non-negative number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to get environment-specific configuration
 */
export function getEnvironmentConfig(environment: 'development' | 'staging' | 'production' = 'development') {
  const baseConfig = {
    development: {
      enabled: false,
      testMode: true,
      apiUrl: 'https://sandbox.clictopay.com/api',
      timeout: 30000,
      retryAttempts: 3,
      enableDebugLogging: true,
    },
    staging: {
      enabled: false,
      testMode: true,
      apiUrl: 'https://sandbox.clictopay.com/api',
      timeout: 30000,
      retryAttempts: 2,
      enableDebugLogging: false,
    },
    production: {
      enabled: false,
      testMode: false,
      apiUrl: 'https://api.clictopay.com/api',
      timeout: 15000,
      retryAttempts: 2,
      enableDebugLogging: false,
    },
  };

  return baseConfig[environment];
}