/**
 * Plugin Registry and Management System
 *
 * Handles plugin registration, lifecycle, and execution
 */
import { Plugin, Cart, LineItem, Discount, Order, User, ValidationResult, FeatureFlags, PluginContext } from './types';
export declare class PluginRegistry {
    private plugins;
    private featureFlags;
    private context;
    /**
     * Register a new plugin
     */
    register(plugin: Plugin): void;
    /**
     * Unregister a plugin
     */
    unregister(pluginName: string): void;
    /**
     * Get a registered plugin
     */
    get(pluginName: string): Plugin | undefined;
    /**
     * Get all registered plugins
     */
    getAll(): Plugin[];
    /**
     * Get enabled plugins only
     */
    getEnabled(): Plugin[];
    /**
     * Enable a plugin
     */
    enable(pluginName: string): void;
    /**
     * Disable a plugin
     */
    disable(pluginName: string): void;
    /**
     * Set feature flags for plugin configuration
     */
    setFeatureFlags(flags: FeatureFlags): void;
    /**
     * Set plugin execution context
     */
    setContext(context: Partial<PluginContext>): void;
    /**
     * Get current plugin context
     */
    getContext(): PluginContext | null;
    /**
     * Execute beforeCartCalculation hooks
     */
    executeBeforeCartCalculation(cart: Cart): Promise<Cart>;
    /**
     * Execute afterCartCalculation hooks
     */
    executeAfterCartCalculation(cart: Cart): Promise<Cart>;
    /**
     * Execute modifyLineItems hooks
     */
    executeModifyLineItems(items: LineItem[]): Promise<LineItem[]>;
    /**
     * Execute calculateDiscounts hooks
     */
    executeCalculateDiscounts(items: LineItem[], cart: Cart): Promise<Discount[]>;
    /**
     * Execute beforeCheckout hooks
     */
    executeBeforeCheckout(cart: Cart): Promise<ValidationResult>;
    /**
     * Execute afterCheckout hooks
     */
    executeAfterCheckout(order: Order): Promise<void>;
    /**
     * Execute user lifecycle hooks
     */
    executeUserLifecycleHook(hookName: 'onUserLogin' | 'onUserRegister' | 'onUserLogout', user: User): Promise<void>;
    /**
     * Execute order lifecycle hooks
     */
    executeOrderLifecycleHook(hookName: 'onOrderCreated' | 'onOrderPaid' | 'onOrderShipped' | 'onOrderCompleted', order: Order): Promise<void>;
    /**
     * Get plugin statistics
     */
    getStats(): {
        total: number;
        enabled: number;
        disabled: number;
        withHooks: Record<string, number>;
    };
    private validatePlugin;
    private isPluginEnabledByFlags;
    private updatePluginContext;
}
export declare const pluginRegistry: PluginRegistry;
//# sourceMappingURL=registry.d.ts.map