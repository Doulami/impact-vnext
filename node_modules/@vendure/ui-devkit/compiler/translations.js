"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTranslationFiles = getAllTranslationFiles;
exports.mergeExtensionTranslations = mergeExtensionTranslations;
const fs = __importStar(require("fs-extra"));
const glob_1 = require("glob");
const path = __importStar(require("path"));
const utils_1 = require("./utils");
/**
 * Given an array of extensions, returns a map of languageCode to all files specified by the
 * configured globs.
 */
function getAllTranslationFiles(extensions) {
    // First collect all globs by language
    const allTranslationsWithGlobs = {};
    for (const extension of extensions) {
        for (const [languageCode, globPattern] of Object.entries(extension.translations || {})) {
            const code = languageCode;
            if (globPattern) {
                if (!allTranslationsWithGlobs[code]) {
                    allTranslationsWithGlobs[code] = [globPattern];
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    allTranslationsWithGlobs[code].push(globPattern);
                }
            }
        }
    }
    const allTranslationsWithFiles = {};
    for (const [languageCode, globs] of Object.entries(allTranslationsWithGlobs)) {
        const code = languageCode;
        allTranslationsWithFiles[code] = [];
        if (!globs) {
            continue;
        }
        for (const pattern of globs) {
            const files = (0, glob_1.globSync)(pattern);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            allTranslationsWithFiles[code].push(...files);
        }
    }
    return allTranslationsWithFiles;
}
async function mergeExtensionTranslations(outputPath, translationFiles) {
    // Now merge them into the final language-speicific json files
    const i18nMessagesDir = path.join(outputPath, 'src/i18n-messages');
    for (const [languageCode, files] of Object.entries(translationFiles)) {
        if (!files) {
            continue;
        }
        const translationFile = path.join(i18nMessagesDir, `${languageCode}.json`);
        const translationBackupFile = path.join(i18nMessagesDir, `${languageCode}.json.bak`);
        if (fs.existsSync(translationBackupFile)) {
            // restore the original translations from the backup
            await fs.copy(translationBackupFile, translationFile);
        }
        let translations = {};
        if (fs.existsSync(translationFile)) {
            // create a backup of the original (unextended) translations
            await fs.copy(translationFile, translationBackupFile);
            try {
                translations = await fs.readJson(translationFile);
            }
            catch (e) {
                utils_1.logger.error(`Could not load translation file: ${translationFile}`);
                utils_1.logger.error(e);
            }
        }
        for (const file of files) {
            try {
                const contents = await fs.readJson(file);
                translations = mergeTranslations(translations, contents);
            }
            catch (e) {
                utils_1.logger.error(`Could not load translation file: ${translationFile}`);
                utils_1.logger.error(e);
            }
        }
        // write the final translation files to disk
        const sortedTranslations = sortTranslationKeys(translations);
        await fs.writeFile(translationFile, JSON.stringify(sortedTranslations, null, 2), 'utf8');
    }
}
/**
 * Sorts the contents of the translation files so the sections & keys are alphabetical.
 */
function sortTranslationKeys(translations) {
    const result = {};
    const sections = Object.keys(translations).sort();
    for (const section of sections) {
        const sortedTokens = Object.entries(translations[section])
            .sort(([keyA], [keyB]) => (keyA < keyB ? -1 : 1))
            .reduce((output, [key, val]) => ({ ...output, [key]: val }), {});
        result[section] = sortedTokens;
    }
    return result;
}
/**
 * Merges the second set of translations into the first, returning a new translations
 * object.
 */
function mergeTranslations(t1, t2) {
    const result = { ...t1 };
    for (const [section, translations] of Object.entries(t2)) {
        result[section] = {
            ...t1[section],
            ...translations,
        };
    }
    return result;
}
//# sourceMappingURL=translations.js.map