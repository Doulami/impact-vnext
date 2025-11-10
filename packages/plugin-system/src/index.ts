/**
 * Impact Nutrition Plugin System
 * 
 * Main entry point for the plugin architecture system
 */

// Export types
export * from './types';

// Export event system
export { PluginEventManager, eventManager } from './events';

// Export plugin registry
export { PluginRegistry, pluginRegistry } from './registry';

// Export convenience functions
export { createPlugin, createPluginTestSuite } from './utils';

// Re-export key types for easy access
export type {
  Plugin,
  PluginHooks,
  PluginContext,
  Cart,
  LineItem,
  Discount,
  Order,
  User,
  ValidationResult,
  FeatureFlags,
  EventName,
  EventPayload
} from './types';