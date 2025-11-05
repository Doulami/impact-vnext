import { LanguageCode } from '@vendure/common/lib/generated-types';
import { TranslationExtension } from './types';
/**
 * Given an array of extensions, returns a map of languageCode to all files specified by the
 * configured globs.
 */
export declare function getAllTranslationFiles(extensions: TranslationExtension[]): {
    [languageCode in LanguageCode]?: string[];
};
export declare function mergeExtensionTranslations(outputPath: string, translationFiles: {
    [languageCode in LanguageCode]?: string[];
}): Promise<void>;
