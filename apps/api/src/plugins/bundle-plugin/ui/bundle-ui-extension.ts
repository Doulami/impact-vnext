import path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';

/**
 * Bundle Plugin Admin UI Extension
 * 
 * Provides multilingual admin interface for:
 * - Bundle creation and management
 * - Component configuration
 * - Lifecycle management (draft, active, broken, archived)
 * - Stock and availability monitoring
 * - Pricing and discount configuration
 * 
 * Features complete internationalization support with English and French translations.
 */
export const bundleUiExtension: AdminUiExtension = {
  id: 'bundle-ui',
  extensionPath: path.join(__dirname),
  ngModules: [
    {
      type: 'shared',
      ngModuleFileName: 'bundle-nav.module.ts',
      ngModuleName: 'BundleNavModule',
    },
    {
      type: 'lazy',
      route: 'bundles',
      ngModuleFileName: 'bundle-ui.module.ts',
      ngModuleName: 'BundleUiModule',
    },
  ],
  translations: {
    en: path.join(__dirname, 'translations/en.json'),
    fr: path.join(__dirname, 'translations/fr.json'),
  },
};
