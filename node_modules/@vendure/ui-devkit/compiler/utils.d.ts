import { AdminUiExtension, AdminUiExtensionWithId, Extension, GlobalStylesExtension, SassVariableOverridesExtension, StaticAssetDefinition, StaticAssetExtension, TranslationExtension } from './types';
export declare const logger: {
    log: (message: string) => void;
    error: (message: string) => void;
};
/**
 * Checks for the global yarn binary to determine whether to use yarn or npm.
 */
export declare function determinePackageManager(): 'yarn' | 'npm';
/**
 * Returns the string path of a static asset
 */
export declare function getStaticAssetPath(staticAssetDef: StaticAssetDefinition): string;
/**
 * Copy the @vendure/ui-devkit files to the static assets dir.
 */
export declare function copyUiDevkit(outputPath: string): void;
/**
 * Copies over any files defined by the extensions' `staticAssets` array to the shared
 * static assets directory. When the app is built by the ng cli, this assets directory is
 * the copied over to the final static assets location (i.e. http://domain/admin/assets/)
 */
export declare function copyStaticAsset(outputPath: string, staticAssetDef: StaticAssetDefinition): Promise<void>;
/**
 * Ensures each extension has an ID and a value for the optional properties.
 * If not defined by the user, a deterministic ID is generated
 * from a hash of the extension config.
 */
export declare function normalizeExtensions(extensions?: AdminUiExtension[]): AdminUiExtensionWithId[];
export declare function isAdminUiExtension(input: Extension): input is AdminUiExtension;
export declare function isTranslationExtension(input: Extension): input is TranslationExtension;
export declare function isStaticAssetExtension(input: Extension): input is StaticAssetExtension;
export declare function isGlobalStylesExtension(input: Extension): input is GlobalStylesExtension;
export declare function isSassVariableOverridesExtension(input: Extension): input is SassVariableOverridesExtension;
