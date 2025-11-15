import path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';

export const bundleUiExtension: AdminUiExtension = {
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
    fr: path.join(__dirname, 'translations/fr.json'),
  },
};
