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
exports.setupScaffold = setupScaffold;
exports.copyGlobalStyleFile = copyGlobalStyleFile;
exports.setBaseHref = setBaseHref;
/* eslint-disable no-console */
const shared_utils_1 = require("@vendure/common/lib/shared-utils");
const fs = __importStar(require("fs-extra"));
const glob_1 = require("glob");
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const translations_1 = require("./translations");
const utils_1 = require("./utils");
async function setupScaffold(outputPath, extensions) {
    deleteExistingExtensionModules(outputPath);
    const adminUiExtensions = extensions.filter((e) => (0, utils_1.isAdminUiExtension)(e));
    const normalizedExtensions = (0, utils_1.normalizeExtensions)(adminUiExtensions);
    const modulePathMapping = generateModulePathMapping(normalizedExtensions);
    copyAdminUiSource(outputPath, modulePathMapping);
    await copyExtensionModules(outputPath, normalizedExtensions);
    const staticAssetExtensions = extensions.filter(utils_1.isStaticAssetExtension);
    await copyStaticAssets(outputPath, staticAssetExtensions);
    const globalStyleExtensions = extensions.filter(utils_1.isGlobalStylesExtension);
    const sassVariableOverridesExtension = extensions.find(utils_1.isSassVariableOverridesExtension);
    await addGlobalStyles(outputPath, globalStyleExtensions, sassVariableOverridesExtension);
    const allTranslationFiles = (0, translations_1.getAllTranslationFiles)(extensions.filter(utils_1.isTranslationExtension));
    await (0, translations_1.mergeExtensionTranslations)(outputPath, allTranslationFiles);
    (0, utils_1.copyUiDevkit)(outputPath);
}
/**
 * Deletes the contents of the /modules directory, which contains the plugin
 * extension modules copied over during the last compilation.
 */
function deleteExistingExtensionModules(outputPath) {
    fs.removeSync(path.join(outputPath, constants_1.MODULES_OUTPUT_DIR));
}
/**
 * Generates a module path mapping object for all extensions with a "pathAlias"
 * property declared (if any).
 */
function generateModulePathMapping(extensions) {
    const extensionsWithAlias = extensions.filter(e => e.pathAlias);
    if (extensionsWithAlias.length === 0) {
        return undefined;
    }
    return extensionsWithAlias.reduce((acc, e) => {
        // for imports from the index file if there is one
        acc[e.pathAlias] = [`src/extensions/${e.id}`];
        // direct access to files / deep imports
        acc[`${e.pathAlias}/*`] = [`src/extensions/${e.id}/*`];
        return acc;
    }, {});
}
/**
 * Copies all files from the extensionPaths of the configured extensions into the
 * admin-ui source tree.
 */
async function copyExtensionModules(outputPath, extensions) {
    const adminUiExtensions = extensions.filter(utils_1.isAdminUiExtension);
    const extensionRoutesSource = generateLazyExtensionRoutes(adminUiExtensions);
    fs.writeFileSync(path.join(outputPath, constants_1.EXTENSION_ROUTES_FILE), extensionRoutesSource, 'utf8');
    const sharedExtensionModulesSource = generateSharedExtensionModule(extensions);
    fs.writeFileSync(path.join(outputPath, constants_1.SHARED_EXTENSIONS_FILE), sharedExtensionModulesSource, 'utf8');
    for (const extension of adminUiExtensions) {
        if (!extension.extensionPath) {
            continue;
        }
        const dest = path.join(outputPath, constants_1.MODULES_OUTPUT_DIR, extension.id);
        if (!extension.exclude) {
            fs.copySync(extension.extensionPath, dest);
            continue;
        }
        const exclude = extension.exclude?.map(e => (0, glob_1.globSync)(path.join(extension.extensionPath, e))).flatMap(e => e) ??
            [];
        fs.copySync(extension.extensionPath, dest, {
            filter: name => name === extension.extensionPath || exclude.every(e => e !== name),
        });
    }
}
async function copyStaticAssets(outputPath, extensions) {
    for (const extension of extensions) {
        if (Array.isArray(extension.staticAssets)) {
            for (const asset of extension.staticAssets) {
                await (0, utils_1.copyStaticAsset)(outputPath, asset);
            }
        }
    }
}
async function addGlobalStyles(outputPath, globalStylesExtensions, sassVariableOverridesExtension) {
    const globalStylesDir = path.join(outputPath, 'src', constants_1.GLOBAL_STYLES_OUTPUT_DIR);
    await fs.remove(globalStylesDir);
    await fs.ensureDir(globalStylesDir);
    const imports = [];
    for (const extension of globalStylesExtensions) {
        const styleFiles = Array.isArray(extension.globalStyles)
            ? extension.globalStyles
            : [extension.globalStyles];
        for (const styleFile of styleFiles) {
            await copyGlobalStyleFile(outputPath, styleFile);
            imports.push(path.basename(styleFile, path.extname(styleFile)));
        }
    }
    let overridesImport = '';
    if (sassVariableOverridesExtension) {
        const overridesFile = sassVariableOverridesExtension.sassVariableOverrides;
        await copyGlobalStyleFile(outputPath, overridesFile);
        overridesImport = `@import "./${constants_1.GLOBAL_STYLES_OUTPUT_DIR}/${path.basename(overridesFile, path.extname(overridesFile))}";\n`;
    }
    const globalStylesSource = overridesImport +
        '@import "./styles/styles";\n' +
        imports.map(file => `@import "./${constants_1.GLOBAL_STYLES_OUTPUT_DIR}/${file}";`).join('\n');
    const globalStylesFile = path.join(outputPath, 'src', 'global-styles.scss');
    await fs.writeFile(globalStylesFile, globalStylesSource, 'utf-8');
}
async function copyGlobalStyleFile(outputPath, stylePath) {
    const globalStylesDir = path.join(outputPath, 'src', constants_1.GLOBAL_STYLES_OUTPUT_DIR);
    const fileBasename = path.basename(stylePath);
    const styleOutputPath = path.join(globalStylesDir, fileBasename);
    await fs.copyFile(stylePath, styleOutputPath);
}
function generateLazyExtensionRoutes(extensions) {
    const routes = [];
    for (const extension of extensions) {
        for (const module of extension.ngModules ?? []) {
            if (module.type === 'lazy') {
                routes.push(`  {
    path: 'extensions/${module.route}',
    loadChildren: () => import('${getModuleFilePath(extension.id, module)}').then(m => m.${module.ngModuleName}),
  }`);
            }
        }
        for (const route of extension.routes ?? []) {
            const prefix = route.prefix === '' ? '' : `${route.prefix ?? 'extensions'}/`;
            routes.push(`  {
    path: '${prefix}${route.route}',
    loadChildren: () => import('./extensions/${extension.id}/${path.basename(route.filePath, '.ts')}'),
  }`);
        }
    }
    return `export const extensionRoutes = [${routes.join(',\n')}];\n`;
}
function generateSharedExtensionModule(extensions) {
    const adminUiExtensions = extensions.filter(utils_1.isAdminUiExtension);
    const moduleImports = adminUiExtensions
        .map(e => e.ngModules
        ?.filter(m => m.type === 'shared')
        .map(m => `import { ${m.ngModuleName} } from '${getModuleFilePath(e.id, m)}';\n`)
        .join(''))
        .filter(val => !!val)
        .join('');
    const providerImports = adminUiExtensions
        .map((m, i) => (m.providers ?? [])
        .map((f, j) => `import SharedProviders_${i}_${j} from './extensions/${m.id}/${path.basename(f, '.ts')}';\n`)
        .join(''))
        .filter(val => !!val)
        .join('');
    const modules = adminUiExtensions
        .map(e => e.ngModules
        ?.filter(m => m.type === 'shared')
        .map(m => m.ngModuleName)
        .join(', '))
        .filter(val => !!val)
        .join(', ');
    const providers = adminUiExtensions
        .filter(shared_utils_1.notNullOrUndefined)
        .map((m, i) => (m.providers ?? []).map((f, j) => `...SharedProviders_${i}_${j}`).join(', '))
        .filter(val => !!val)
        .join(', ');
    return `import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
${moduleImports}
${providerImports}

@NgModule({
    imports: [CommonModule, ${modules}],
    providers: [${providers}],
})
export class SharedExtensionsModule {}
`;
}
function getModuleFilePath(id, module) {
    return `./extensions/${id}/${path.basename(module.ngModuleFileName, '.ts')}`;
}
/**
 * Copies the Admin UI sources & static assets to the outputPath if it does not already
 * exist there.
 */
function copyAdminUiSource(outputPath, modulePathMapping) {
    const tsconfigFilePath = path.join(outputPath, 'tsconfig.json');
    const indexFilePath = path.join(outputPath, '/src/index.html');
    if (fs.existsSync(tsconfigFilePath) && fs.existsSync(indexFilePath)) {
        configureModulePathMapping(tsconfigFilePath, modulePathMapping);
        return;
    }
    const scaffoldDir = path.join(__dirname, '../scaffold');
    const adminUiSrc = path.join(require.resolve('@vendure/admin-ui'), '../../static');
    if (!fs.existsSync(scaffoldDir)) {
        throw new Error(`Could not find the admin ui scaffold files at ${scaffoldDir}`);
    }
    if (!fs.existsSync(adminUiSrc)) {
        throw new Error(`Could not find the @vendure/admin-ui sources. Looked in ${adminUiSrc}`);
    }
    // copy scaffold
    fs.removeSync(outputPath);
    fs.ensureDirSync(outputPath);
    fs.copySync(scaffoldDir, outputPath);
    configureModulePathMapping(tsconfigFilePath, modulePathMapping);
    // copy source files from admin-ui package
    const outputSrc = path.join(outputPath, 'src');
    fs.ensureDirSync(outputSrc);
    fs.copySync(adminUiSrc, outputSrc);
}
async function setBaseHref(outputPath, baseHref) {
    const angularJsonFilePath = path.join(outputPath, '/angular.json');
    const angularJson = await fs.readJSON(angularJsonFilePath, 'utf-8');
    angularJson.projects['vendure-admin'].architect.build.options.baseHref = baseHref;
    await fs.writeJSON(angularJsonFilePath, angularJson, { spaces: 2 });
}
/**
 * Adds module path mapping to the bundled tsconfig.json file if defined as a UI extension.
 */
function configureModulePathMapping(tsconfigFilePath, modulePathMapping) {
    if (!modulePathMapping) {
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tsconfig = require(tsconfigFilePath);
    tsconfig.compilerOptions.paths = modulePathMapping;
    fs.writeFileSync(tsconfigFilePath, JSON.stringify(tsconfig, null, 2));
}
//# sourceMappingURL=scaffold.js.map