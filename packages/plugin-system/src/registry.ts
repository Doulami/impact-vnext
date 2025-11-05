/**
 * Plugin Registry and Management System
 * 
 * Handles plugin registration, lifecycle, and execution
 */

import { 
  Plugin, 
  PluginHooks, 
  Cart, 
  LineItem, 
  Discount, 
  Order, 
  User, 
  ValidationResult,
  FeatureFlags,
  PluginContext,
  EventName
} from './types';
import { eventManager } from './events';

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private featureFlags: FeatureFlags | null = null;
  private context: PluginContext | null = null;

  /**
   * Register a new plugin
   */
  register(plugin: Plugin): void {
    // Check for duplicate names
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Validate plugin structure
    this.validatePlugin(plugin);

    // Register the plugin
    this.plugins.set(plugin.name, plugin);
    
    console.log(`[Plugin Registry] Registered plugin: ${plugin.name} v${plugin.version}`);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginName: string): void {
    if (this.plugins.has(pluginName)) {
      this.plugins.delete(pluginName);
      console.log(`[Plugin Registry] Unregistered plugin: ${pluginName}`);
    }
  }

  /**
   * Get a registered plugin
   */
  get(pluginName: string): Plugin | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * Get all registered plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins only
   */
  getEnabled(): Plugin[] {
    return this.getAll().filter(plugin => plugin.enabled);
  }

  /**
   * Enable a plugin
   */
  enable(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.enabled = true;
      console.log(`[Plugin Registry] Enabled plugin: ${pluginName}`);
    }
  }

  /**
   * Disable a plugin
   */
  disable(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.enabled = false;
      console.log(`[Plugin Registry] Disabled plugin: ${pluginName}`);
    }
  }

  /**
   * Set feature flags for plugin configuration
   */
  setFeatureFlags(flags: FeatureFlags): void {
    this.featureFlags = flags;
    this.updatePluginContext();
  }

  /**
   * Set plugin execution context
   */
  setContext(context: Partial<PluginContext>): void {
    this.context = {
      featureFlags: this.featureFlags!,
      config: {},
      emit: eventManager.emit.bind(eventManager),
      ...context
    };
  }

  // ========== Hook Execution Methods ==========

  /**
   * Execute beforeCartCalculation hooks
   */
  async executeBeforeCartCalculation(cart: Cart): Promise<Cart> {
    let modifiedCart = cart;
    
    for (const plugin of this.getEnabled()) {
      if (plugin.hooks.beforeCartCalculation && this.isPluginEnabledByFlags(plugin)) {
        try {
          const result = await plugin.hooks.beforeCartCalculation(modifiedCart);
          modifiedCart = result;
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.beforeCartCalculation:`, error);
        }
      }
    }
    
    return modifiedCart;
  }

  /**
   * Execute afterCartCalculation hooks
   */
  async executeAfterCartCalculation(cart: Cart): Promise<Cart> {
    let modifiedCart = cart;
    
    for (const plugin of this.getEnabled()) {
      if (plugin.hooks.afterCartCalculation && this.isPluginEnabledByFlags(plugin)) {
        try {
          const result = await plugin.hooks.afterCartCalculation(modifiedCart);
          modifiedCart = result;
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.afterCartCalculation:`, error);
        }
      }
    }
    
    return modifiedCart;
  }

  /**
   * Execute modifyLineItems hooks
   */
  async executeModifyLineItems(items: LineItem[]): Promise<LineItem[]> {
    let modifiedItems = items;
    
    for (const plugin of this.getEnabled()) {
      if (plugin.hooks.modifyLineItems && this.isPluginEnabledByFlags(plugin)) {
        try {
          const result = await plugin.hooks.modifyLineItems(modifiedItems);
          modifiedItems = result;
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.modifyLineItems:`, error);
        }
      }
    }
    
    return modifiedItems;
  }

  /**
   * Execute calculateDiscounts hooks
   */
  async executeCalculateDiscounts(items: LineItem[], cart: Cart): Promise<Discount[]> {
    const allDiscounts: Discount[] = [];
    
    for (const plugin of this.getEnabled()) {
      if (plugin.hooks.calculateDiscounts && this.isPluginEnabledByFlags(plugin)) {
        try {
          const discounts = await plugin.hooks.calculateDiscounts(items, cart);
          allDiscounts.push(...discounts);
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.calculateDiscounts:`, error);
        }
      }
    }
    
    return allDiscounts;
  }

  /**
   * Execute beforeCheckout hooks
   */
  async executeBeforeCheckout(cart: Cart): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    for (const plugin of this.getEnabled()) {
      if (plugin.hooks.beforeCheckout && this.isPluginEnabledByFlags(plugin)) {
        try {
          const result = await plugin.hooks.beforeCheckout(cart);
          if (!result.isValid) {
            errors.push(...result.errors);
          }
          if (result.warnings) {
            warnings.push(...result.warnings);
          }
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.beforeCheckout:`, error);
          errors.push(`Plugin ${plugin.name} validation failed`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute afterCheckout hooks
   */
  async executeAfterCheckout(order: Order): Promise<void> {
    for (const plugin of this.getEnabled()) {
      if (plugin.hooks.afterCheckout && this.isPluginEnabledByFlags(plugin)) {
        try {
          await plugin.hooks.afterCheckout(order);
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.afterCheckout:`, error);
        }
      }
    }
  }

  /**
   * Execute user lifecycle hooks
   */
  async executeUserLifecycleHook(
    hookName: 'onUserLogin' | 'onUserRegister' | 'onUserLogout',
    user: User
  ): Promise<void> {
    for (const plugin of this.getEnabled()) {
      const hook = plugin.hooks[hookName];
      if (hook && this.isPluginEnabledByFlags(plugin)) {
        try {
          await hook(user);
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.${hookName}:`, error);
        }
      }
    }
  }

  /**
   * Execute order lifecycle hooks
   */
  async executeOrderLifecycleHook(
    hookName: 'onOrderCreated' | 'onOrderPaid' | 'onOrderShipped' | 'onOrderCompleted',
    order: Order
  ): Promise<void> {
    for (const plugin of this.getEnabled()) {
      const hook = plugin.hooks[hookName];
      if (hook && this.isPluginEnabledByFlags(plugin)) {
        try {
          await hook(order);
        } catch (error) {
          console.error(`[Plugin Registry] Error in ${plugin.name}.${hookName}:`, error);
        }
      }
    }
  }

  // ========== Plugin Management ==========

  /**
   * Get plugin statistics
   */
  getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    withHooks: Record<string, number>;
  } {
    const plugins = this.getAll();
    const enabled = this.getEnabled();
    
    const hookStats: Record<string, number> = {};
    const hookNames = [
      'beforeCartCalculation',
      'afterCartCalculation',
      'modifyLineItems',
      'calculateDiscounts',
      'beforeCheckout',
      'afterCheckout',
      'onUserLogin',
      'onUserRegister',
      'onUserLogout',
      'onOrderCreated',
      'onOrderPaid',
      'onOrderShipped',
      'onOrderCompleted'
    ];

    for (const hookName of hookNames) {
      hookStats[hookName] = enabled.filter(
        plugin => plugin.hooks[hookName as keyof PluginHooks]
      ).length;
    }

    return {
      total: plugins.length,
      enabled: enabled.length,
      disabled: plugins.length - enabled.length,
      withHooks: hookStats
    };
  }

  // ========== Private Methods ==========

  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }
    
    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new Error('Plugin must have a valid version');
    }
    
    if (!plugin.hooks || typeof plugin.hooks !== 'object') {
      throw new Error('Plugin must have hooks object');
    }
    
    if (typeof plugin.enabled !== 'boolean') {
      plugin.enabled = true; // Default to enabled
    }
  }

  private isPluginEnabledByFlags(plugin: Plugin): boolean {
    if (!this.featureFlags) {
      return true; // If no feature flags, allow all plugins
    }

    // Check feature flags based on plugin name
    const pluginName = plugin.name.toLowerCase();
    
    if (pluginName.includes('bundle')) {
      return this.featureFlags.plugins.bundles.enabled;
    }
    
    if (pluginName.includes('discount')) {
      return this.featureFlags.plugins.discounts.enabled;
    }
    
    if (pluginName.includes('loyalty')) {
      return this.featureFlags.plugins.loyalty.enabled;
    }
    
    if (pluginName.includes('review')) {
      return this.featureFlags.plugins.reviews.enabled;
    }
    
    if (pluginName.includes('wishlist')) {
      return this.featureFlags.plugins.wishlist.enabled;
    }
    
    // Default to enabled if no specific flag found
    return true;
  }

  private updatePluginContext(): void {
    if (this.featureFlags) {
      this.context = {
        featureFlags: this.featureFlags,
        config: {},
        emit: eventManager.emit.bind(eventManager)
      };
    }
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();