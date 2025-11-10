/**
 * Impact Nutrition Plugin System
 *
 * Main entry point for the plugin architecture system
 */
export * from './types';
export { PluginEventManager, eventManager } from './events';
export { PluginRegistry, pluginRegistry } from './registry';
export { createPlugin, createPluginTestSuite } from './utils';
export type { Plugin, PluginHooks, PluginContext, Cart, LineItem, Discount, Order, User, ValidationResult, FeatureFlags, EventName, EventPayload } from './types';
//# sourceMappingURL=index.d.ts.map