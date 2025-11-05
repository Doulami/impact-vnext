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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.determinePackageManager = determinePackageManager;
exports.getStaticAssetPath = getStaticAssetPath;
exports.copyUiDevkit = copyUiDevkit;
exports.copyStaticAsset = copyStaticAsset;
exports.normalizeExtensions = normalizeExtensions;
exports.isAdminUiExtension = isAdminUiExtension;
exports.isTranslationExtension = isTranslationExtension;
exports.isStaticAssetExtension = isStaticAssetExtension;
exports.isGlobalStylesExtension = isGlobalStylesExtension;
exports.isSassVariableOverridesExtension = isSassVariableOverridesExtension;
/* eslint-disable no-console */
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
exports.logger = {
    log: (message) => console.log(chalk_1.default.green(message)),
    error: (message) => console.log(chalk_1.default.red(message)),
};
/**
 * Checks for the global yarn binary to determine whether to use yarn or npm.
 */
function determinePackageManager() {
    try {
        (0, child_process_1.execSync)('yarnpkg --version', { stdio: 'ignore' });
        return 'yarn';
    }
    catch (e) {
        return 'npm';
    }
}
/**
 * Returns the string path of a static asset
 */
function getStaticAssetPath(staticAssetDef) {
    return typeof staticAssetDef === 'string' ? staticAssetDef : staticAssetDef.path;
}
/**
 * Copy the @vendure/ui-devkit files to the static assets dir.
 */
function copyUiDevkit(outputPath) {
    const devkitDir = path.join(outputPath, constants_1.STATIC_ASSETS_OUTPUT_DIR, 'devkit');
    fs.ensureDirSync(devkitDir);
    fs.copySync(require.resolve('@vendure/ui-devkit'), path.join(devkitDir, 'ui-devkit.js'));
}
/**
 * Copies over any files defined by the extensions' `staticAssets` array to the shared
 * static assets directory. When the app is built by the ng cli, this assets directory is
 * the copied over to the final static assets location (i.e. http://domain/admin/assets/)
 */
async function copyStaticAsset(outputPath, staticAssetDef) {
    const staticAssetPath = getStaticAssetPath(staticAssetDef);
    const assetBasename = path.basename(staticAssetPath);
    const assetOutputPath = path.join(outputPath, constants_1.STATIC_ASSETS_OUTPUT_DIR, assetBasename);
    fs.copySync(staticAssetPath, assetOutputPath);
    if (typeof staticAssetDef !== 'string') {
        // The asset is being renamed
        const newName = path.join(path.dirname(assetOutputPath), staticAssetDef.rename);
        try {
            // We use copy, remove rather than rename due to problems with the
            // EPERM error in Windows.
            await fs.copy(assetOutputPath, newName);
            await fs.remove(assetOutputPath);
        }
        catch (e) {
            exports.logger.log(e);
        }
    }
}
/**
 * Ensures each extension has an ID and a value for the optional properties.
 * If not defined by the user, a deterministic ID is generated
 * from a hash of the extension config.
 */
function normalizeExtensions(extensions) {
    return (extensions || []).map(e => {
        let id = e.id;
        if (!id) {
            const hash = (0, crypto_1.createHash)('sha256');
            hash.update(JSON.stringify(e));
            id = hash.digest('hex');
        }
        return {
            staticAssets: [],
            translations: {},
            globalStyles: [],
            ...e,
            id,
        };
    });
}
function isAdminUiExtension(input) {
    return input.hasOwnProperty('extensionPath');
}
function isTranslationExtension(input) {
    return input.hasOwnProperty('translations');
}
function isStaticAssetExtension(input) {
    return input.hasOwnProperty('staticAssets');
}
function isGlobalStylesExtension(input) {
    return input.hasOwnProperty('globalStyles');
}
function isSassVariableOverridesExtension(input) {
    return input.hasOwnProperty('sassVariableOverrides');
}
//# sourceMappingURL=utils.js.map