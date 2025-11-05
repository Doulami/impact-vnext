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
exports.compileUiExtensions = compileUiExtensions;
const child_process_1 = require("child_process");
const chokidar_1 = require("chokidar");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const scaffold_1 = require("./scaffold");
const translations_1 = require("./translations");
const utils_1 = require("./utils");
/**
 * @description
 * Compiles the Admin UI app with the specified extensions.
 *
 * @docsCategory UiDevkit
 */
function compileUiExtensions(options) {
    const { devMode, watchPort } = options;
    const command = options.command && ['npm', 'pnpm'].includes(options.command)
        ? options.command
        : (0, utils_1.determinePackageManager)();
    if (devMode) {
        return runWatchMode({
            watchPort: watchPort || 4200,
            ...options,
            command,
        });
    }
    else {
        return runCompileMode({
            ...options,
            command,
        });
    }
}
function runCompileMode({ outputPath, baseHref, extensions, command, additionalProcessArguments, ngCompilerPath, }) {
    const distPath = path.join(outputPath, 'dist');
    const compile = () => new Promise(async (resolve, reject) => {
        await (0, scaffold_1.setupScaffold)(outputPath, extensions);
        await (0, scaffold_1.setBaseHref)(outputPath, baseHref || constants_1.DEFAULT_BASE_HREF);
        let cmd = command;
        let commandArgs = ['run', 'build'];
        if (ngCompilerPath) {
            cmd = 'node';
            commandArgs = [ngCompilerPath, 'build', '--configuration production'];
        }
        else {
            if (cmd === 'npm') {
                // npm requires `--` before any command line args being passed to a script
                commandArgs.splice(2, 0, '--');
            }
        }
        console.log(`Running ${cmd} ${commandArgs.join(' ')}`);
        const buildProcess = (0, child_process_1.spawn)(cmd, [...commandArgs, ...buildProcessArguments(additionalProcessArguments)], {
            cwd: outputPath,
            shell: true,
            stdio: 'inherit',
        });
        buildProcess.on('close', code => {
            if (code !== 0) {
                reject(code);
            }
            else {
                resolve();
            }
        });
    });
    return {
        path: distPath,
        compile,
        route: baseHrefToRoute(baseHref || constants_1.DEFAULT_BASE_HREF),
    };
}
function runWatchMode({ outputPath, baseHref, watchPort, extensions, command, additionalProcessArguments, ngCompilerPath, }) {
    const devkitPath = require.resolve('@vendure/ui-devkit');
    let buildProcess;
    let watcher;
    let close = () => {
        /* */
    };
    const compile = () => new Promise(async (resolve, reject) => {
        await (0, scaffold_1.setupScaffold)(outputPath, extensions);
        await (0, scaffold_1.setBaseHref)(outputPath, baseHref || constants_1.DEFAULT_BASE_HREF);
        const adminUiExtensions = extensions.filter(utils_1.isAdminUiExtension);
        const normalizedExtensions = (0, utils_1.normalizeExtensions)(adminUiExtensions);
        const globalStylesExtensions = extensions.filter(utils_1.isGlobalStylesExtension);
        const staticAssetExtensions = extensions.filter(utils_1.isStaticAssetExtension);
        const allTranslationFiles = (0, translations_1.getAllTranslationFiles)(extensions.filter(utils_1.isTranslationExtension));
        let cmd = command;
        let commandArgs = ['run', 'start'];
        if (ngCompilerPath) {
            cmd = 'node';
            commandArgs = [ngCompilerPath, 'serve'];
        }
        buildProcess = (0, child_process_1.spawn)(cmd, [
            ...commandArgs,
            `--port=${watchPort || 4200}`,
            ...buildProcessArguments(additionalProcessArguments),
        ], {
            cwd: outputPath,
            shell: true,
            stdio: 'inherit',
        });
        buildProcess.on('close', code => {
            if (code !== 0) {
                reject(code);
            }
            else {
                resolve();
            }
            close();
        });
        for (const extension of normalizedExtensions) {
            if (!watcher) {
                watcher = (0, chokidar_1.watch)(extension.extensionPath, {
                    depth: 4,
                    ignored: '**/node_modules/',
                });
            }
            else {
                watcher.add(extension.extensionPath);
            }
        }
        for (const extension of staticAssetExtensions) {
            for (const staticAssetDef of extension.staticAssets) {
                const assetPath = (0, utils_1.getStaticAssetPath)(staticAssetDef);
                if (!watcher) {
                    watcher = (0, chokidar_1.watch)(assetPath);
                }
                else {
                    watcher.add(assetPath);
                }
            }
        }
        for (const extension of globalStylesExtensions) {
            const globalStylePaths = Array.isArray(extension.globalStyles)
                ? extension.globalStyles
                : [extension.globalStyles];
            for (const stylePath of globalStylePaths) {
                if (!watcher) {
                    watcher = (0, chokidar_1.watch)(stylePath);
                }
                else {
                    watcher.add(stylePath);
                }
            }
        }
        for (const translationFiles of Object.values(allTranslationFiles)) {
            if (!translationFiles) {
                continue;
            }
            for (const file of translationFiles) {
                if (!watcher) {
                    watcher = (0, chokidar_1.watch)(file);
                }
                else {
                    watcher.add(file);
                }
            }
        }
        if (watcher) {
            // watch the ui-devkit package files too
            watcher.add(devkitPath);
        }
        if (watcher) {
            const allStaticAssetDefs = staticAssetExtensions.reduce((defs, e) => [...defs, ...(e.staticAssets || [])], []);
            const allGlobalStyles = globalStylesExtensions.reduce((defs, e) => [
                ...defs,
                ...(Array.isArray(e.globalStyles) ? e.globalStyles : [e.globalStyles]),
            ], []);
            watcher.on('change', async (filePath) => {
                const extension = normalizedExtensions.find(e => filePath.includes(e.extensionPath));
                if (extension) {
                    const outputDir = path.join(outputPath, constants_1.MODULES_OUTPUT_DIR, extension.id);
                    const filePart = path.relative(extension.extensionPath, filePath);
                    const dest = path.join(outputDir, filePart);
                    await fs.copyFile(filePath, dest);
                }
                if (filePath.includes(devkitPath)) {
                    (0, utils_1.copyUiDevkit)(outputPath);
                }
                for (const staticAssetDef of allStaticAssetDefs) {
                    const assetPath = (0, utils_1.getStaticAssetPath)(staticAssetDef);
                    if (filePath.includes(assetPath)) {
                        await (0, utils_1.copyStaticAsset)(outputPath, staticAssetDef);
                        return;
                    }
                }
                for (const stylePath of allGlobalStyles) {
                    if (filePath.includes(stylePath)) {
                        await (0, scaffold_1.copyGlobalStyleFile)(outputPath, stylePath);
                        return;
                    }
                }
                for (const languageCode of Object.keys(allTranslationFiles)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const translationFiles = allTranslationFiles[languageCode];
                    for (const file of translationFiles) {
                        if (filePath.includes(path.normalize(file))) {
                            await (0, translations_1.mergeExtensionTranslations)(outputPath, {
                                [languageCode]: translationFiles,
                            });
                        }
                    }
                }
            });
        }
        resolve();
    });
    close = () => {
        if (watcher) {
            void watcher.close();
        }
        if (buildProcess) {
            buildProcess.kill();
        }
        process.exit();
    };
    process.on('SIGINT', close);
    return {
        sourcePath: outputPath,
        port: watchPort || 4200,
        compile,
        route: baseHrefToRoute(baseHref || constants_1.DEFAULT_BASE_HREF),
    };
}
function buildProcessArguments(args) {
    return (args ?? []).map(arg => {
        if (Array.isArray(arg)) {
            const [key, value] = arg;
            return `${key}=${value}`;
        }
        return arg;
    });
}
function baseHrefToRoute(baseHref) {
    return baseHref.replace(/^\//, '').replace(/\/$/, '');
}
//# sourceMappingURL=compile.js.map