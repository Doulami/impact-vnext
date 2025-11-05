import { AdminUiAppConfig, AdminUiAppDevModeConfig } from '@vendure/common/lib/shared-types';
import { UiExtensionCompilerOptions } from './types';
/**
 * @description
 * Compiles the Admin UI app with the specified extensions.
 *
 * @docsCategory UiDevkit
 */
export declare function compileUiExtensions(options: UiExtensionCompilerOptions): AdminUiAppConfig | AdminUiAppDevModeConfig;
