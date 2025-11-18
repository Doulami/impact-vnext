import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, Logger, EntityNotFoundError } from '@vendure/core';
import { ClicToPayConfig, defaultClicToPayConfig, CONFIG_VALIDATION_RULES, CLICTOPAY_API_URLS } from '../types/clictopay-config.types';
import { ClicToPayPlugin } from '../clictopay.plugin';

/**
 * Entity to store ClicToPay configuration in database
 * Using a simple approach similar to other Vendure plugins
 */
export interface ClicToPayConfigEntity {
  id: number;
  config: ClicToPayConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ClicToPay Configuration Service
 * 
 * Manages plugin configuration, validation, and persistence.
 * Provides methods to get, update, and validate ClicToPay settings.
 */
@Injectable()
export class ClicToPayConfigService {
  private static readonly loggerCtx = 'ClicToPayConfigService';
  private static readonly CONFIG_ID = 1; // Singleton configuration

  private cachedConfig: ClicToPayConfig | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor(
    private connection: TransactionalConnection,
  ) {}

  /**
   * Get current ClicToPay configuration
   * Returns cached config if available, otherwise loads from database
   */
  async getConfig(ctx: RequestContext): Promise<ClicToPayConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.cachedConfig && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedConfig;
    }

    try {
      // Try to load config from database (implementation depends on storage strategy)
      // For now, we'll use a simple in-memory approach with defaults
      const config = await this.loadConfigFromStorage(ctx);
      
      this.cachedConfig = config;
      this.cacheTimestamp = now;
      
      return config;
    } catch (error) {
      Logger.warn(
        `Failed to load config from database, using defaults: ${error instanceof Error ? error.message : String(error)}`,
        ClicToPayConfigService.loggerCtx
      );
      
      // Return default config if database load fails
      return this.getDefaultConfig();
    }
  }

  /**
   * Update ClicToPay configuration
   * Validates config before saving and clears cache
   */
  async updateConfig(ctx: RequestContext, newConfig: Partial<ClicToPayConfig>): Promise<ClicToPayConfig> {
    // Get current config and merge with updates
    const currentConfig = await this.getConfig(ctx);
    const updatedConfig: ClicToPayConfig = {
      ...currentConfig,
      ...newConfig,
    };

    // Validate the updated configuration
    const validation = this.validateConfig(updatedConfig);
    if (!validation.isValid) {
      const errorMessage = `Configuration validation failed: ${validation.errors.join(', ')}`;
      Logger.error(errorMessage, ClicToPayConfigService.loggerCtx);
      throw new Error(errorMessage);
    }

    // Update API URL based on test mode if not explicitly provided
    if (!newConfig.apiUrl && newConfig.testMode !== undefined) {
      updatedConfig.apiUrl = newConfig.testMode ? CLICTOPAY_API_URLS.test : CLICTOPAY_API_URLS.production;
    }

    try {
      // Save to storage
      await this.saveConfigToStorage(ctx, updatedConfig);
      
      // Clear cache
      this.clearCache();
      
      Logger.info(
        `ClicToPay configuration updated successfully`,
        ClicToPayConfigService.loggerCtx
      );

      return updatedConfig;
    } catch (error) {
      Logger.error(
        `Failed to update ClicToPay configuration: ${error instanceof Error ? error.message : String(error)}`,
        ClicToPayConfigService.loggerCtx
      );
      throw error;
    }
  }

  /**
   * Validate ClicToPay configuration
   */
  validateConfig(config: ClicToPayConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    CONFIG_VALIDATION_RULES.forEach(rule => {
      const value = config[rule.field];
      
      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`);
        return;
      }

      // Skip validation if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === '')) {
        return;
      }

      // Type validation
      if (typeof value !== rule.type) {
        errors.push(`${rule.field} must be of type ${rule.type}`);
        return;
      }

      // String length validation
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`${rule.field} must be at least ${rule.minLength} characters long`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`);
        }
      }

      // Number range validation
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`${rule.field} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`${rule.field} must not exceed ${rule.max}`);
        }
      }
    });

    // Custom validation rules
    if (config.testMode && config.apiUrl && !config.apiUrl.includes('test')) {
      errors.push('API URL should point to test environment when test mode is enabled');
    }

    if (!config.testMode && config.apiUrl && config.apiUrl.includes('test')) {
      errors.push('API URL should point to production environment when test mode is disabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Test ClicToPay configuration connectivity
   */
  async testConfiguration(ctx: RequestContext, config?: ClicToPayConfig): Promise<{ success: boolean; message: string }> {
    const testConfig = config || await this.getConfig(ctx);

    if (!testConfig.enabled) {
      return {
        success: false,
        message: 'ClicToPay is currently disabled',
      };
    }

    // Basic configuration validation
    const validation = this.validateConfig(testConfig);
    if (!validation.isValid) {
      return {
        success: false,
        message: `Configuration validation failed: ${validation.errors.join(', ')}`,
      };
    }

    // Check required credentials
    if (!testConfig.username || !testConfig.password) {
      return {
        success: false,
        message: 'Username and password are required for ClicToPay integration',
      };
    }

    return {
      success: true,
      message: 'Configuration appears valid - API connectivity test requires actual payment registration',
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(ctx: RequestContext): Promise<ClicToPayConfig> {
    const defaultConfig = this.getDefaultConfig();
    return await this.updateConfig(ctx, defaultConfig);
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): ClicToPayConfig {
    return { ...defaultClicToPayConfig };
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Check if ClicToPay is enabled and properly configured
   */
  async isEnabled(ctx: RequestContext): Promise<boolean> {
    try {
      const config = await this.getConfig(ctx);
      return config.enabled && !!config.username && !!config.password;
    } catch (error) {
      Logger.warn(
        `Failed to check if ClicToPay is enabled: ${error instanceof Error ? error.message : String(error)}`,
        ClicToPayConfigService.loggerCtx
      );
      return false;
    }
  }

  /**
   * Load configuration from storage
   * Uses plugin initialization config merged with defaults
   */
  private async loadConfigFromStorage(ctx: RequestContext): Promise<ClicToPayConfig> {
    // Get initialization config from plugin static method
    const pluginConfig = ClicToPayPlugin.getConfig();
    
    // Merge plugin config with defaults
    const mergedConfig: ClicToPayConfig = {
      ...this.getDefaultConfig(),
      ...pluginConfig,
    };
    
    Logger.info(
      `Loading ClicToPay config - enabled: ${mergedConfig.enabled}, hasUsername: ${!!mergedConfig.username}, hasPassword: ${!!mergedConfig.password}`,
      ClicToPayConfigService.loggerCtx
    );
    
    return mergedConfig;
  }

  /**
   * Save configuration to storage
   * TODO: Implement proper database storage when needed
   */
  private async saveConfigToStorage(ctx: RequestContext, config: ClicToPayConfig): Promise<void> {
    // For now, just log that we would save to database
    Logger.info(
      'Configuration would be saved to database in production implementation',
      ClicToPayConfigService.loggerCtx
    );
    
    // In a real implementation, this would save to a database table
    // Example:
    // const configRepo = this.connection.getRepository(ctx, ClicToPayConfigEntity);
    // await configRepo.save({ id: CONFIG_ID, config, updatedAt: new Date() });
  }

  /**
   * Get configuration for admin UI display
   * Masks sensitive information like passwords
   */
  async getConfigForAdminUI(ctx: RequestContext): Promise<Partial<ClicToPayConfig>> {
    const config = await this.getConfig(ctx);
    
    return {
      ...config,
      password: config.password ? '••••••••' : '', // Mask password
      webhookSecret: config.webhookSecret ? '••••••••' : '', // Mask webhook secret
    };
  }
}