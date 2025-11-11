import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    LanguageCode,
} from '@vendure/core';
import { codPaymentHandler } from './payment-handlers/cod-payment-handler';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { CustomerAdminVerificationPlugin } from './plugins/customer-admin-verification.plugin';
import { BundlePlugin, bundleUiExtension } from './plugins/bundle-plugin/bundle.plugin';
import { FeaturedCollectionPlugin } from './plugins/featured-collection.plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
            cors: {
                origin: ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
                credentials: true,
            },
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
          sameSite: 'lax',
        },
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler, codPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Product: [
            // Bundle shell product fields
            { name: 'isBundle', type: 'boolean', nullable: true, defaultValue: false, label: [{ languageCode: LanguageCode.en, value: 'Is Bundle' }], description: [{ languageCode: LanguageCode.en, value: 'Marks this product as a bundle shell for SEO/PLP' }] },
            { name: 'bundleId', type: 'string', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle ID' }], description: [{ languageCode: LanguageCode.en, value: 'References the Bundle entity ID' }] },
            // Phase 5: Shell sync fields
            { name: 'bundlePrice', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Price' }], description: [{ languageCode: LanguageCode.en, value: 'Computed bundle price (cents, synced from Bundle)' }] },
            { name: 'bundleAvailability', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Availability' }], description: [{ languageCode: LanguageCode.en, value: 'A_final availability (synced from Bundle)' }] },
            { name: 'bundleComponents', type: 'string', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Components' }], description: [{ languageCode: LanguageCode.en, value: 'JSON: [{variantId, qty}]' }] }
        ],
        OrderLine: [
            // Bundle metadata fields for exploded bundles
            { name: 'bundleKey', type: 'string', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Key' }], description: [{ languageCode: LanguageCode.en, value: 'UUID per bundle instance for grouping' }] },
            { name: 'bundleId', type: 'string', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle ID' }], description: [{ languageCode: LanguageCode.en, value: 'BundleDefinition.id reference' }] },
            { name: 'bundleName', type: 'string', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Name' }], description: [{ languageCode: LanguageCode.en, value: 'Bundle name snapshot' }] },
            { name: 'bundleVersion', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Version' }], description: [{ languageCode: LanguageCode.en, value: 'Bundle version snapshot' }] },
            { name: 'bundleComponentQty', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Component Qty' }], description: [{ languageCode: LanguageCode.en, value: 'Qty of this variant per 1 bundle' }] },
            { name: 'baseUnitPrice', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Base Unit Price' }], description: [{ languageCode: LanguageCode.en, value: 'Unit price before bundle discount (cents)' }] },
            { name: 'effectiveUnitPrice', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Effective Unit Price' }], description: [{ languageCode: LanguageCode.en, value: 'Unit price after discount (cents)' }] },
            { name: 'bundlePctApplied', type: 'float', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle % Applied' }], description: [{ languageCode: LanguageCode.en, value: 'Effective % applied to this line (0-100, 4 decimals)' }] },
            { name: 'bundleAdjAmount', type: 'int', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Adj Amount' }], description: [{ languageCode: LanguageCode.en, value: 'Negative total discount amount for this line (cents)' }] },
            { name: 'bundleShare', type: 'float', nullable: true, label: [{ languageCode: LanguageCode.en, value: 'Bundle Share' }], description: [{ languageCode: LanguageCode.en, value: 'Share used for proration (6 decimals)' }] },
            { name: 'isBundleHeader', type: 'boolean', nullable: true, defaultValue: false, label: [{ languageCode: LanguageCode.en, value: 'Is Bundle Header' }], description: [{ languageCode: LanguageCode.en, value: 'True only for cosmetic group header line' }] }
        ]
    },
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            port: 3002,
            app: compileUiExtensions({
                outputPath: path.join(__dirname, '../admin-ui'),
                extensions: [
                    {
                        extensionPath: path.join(__dirname, '../ui-extensions'),
                        providers: ['providers.ts'],
                    },
                    bundleUiExtension,
                ],
                devMode: IS_DEV,
            }),
            adminUiConfig: {
                apiHost: 'http://localhost',
                apiPort: serverPort,
            },
            compatibilityMode: true,
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: path.join(__dirname, '../dist/dashboard'),
        }),
        // Custom plugin for manual customer verification
        CustomerAdminVerificationPlugin,
        // Bundle Plugin for product bundles
        BundlePlugin,
        // Auto-create Featured collection
        FeaturedCollectionPlugin,
    ],
};
