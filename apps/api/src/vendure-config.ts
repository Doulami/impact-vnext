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
import { DashboardPlugin } from '@vendure/dashboard/plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { CustomerAdminVerificationPlugin } from './plugins/customer-admin-verification.plugin';
import { BundlePlugin } from './plugins/bundle-plugin/bundle.plugin';
import { RewardPointsPlugin } from './plugins/reward-points-plugin';
import { FeaturedCollectionPlugin } from './plugins/featured-collection.plugin';
import { autoExpireBundlesTask } from './plugins/bundle-plugin/tasks/auto-expire-bundles.task';
import { bundleConsistencyCheckTask } from './plugins/bundle-plugin/tasks/bundle-consistency-check.task';
import { NutritionBatchPlugin } from './plugins/nutrition-batch-plugin/nutrition-batch.plugin';
import { ClicToPayPlugin } from './plugins/clictopay-plugin/clictopay.plugin';
import { FrequentlyBoughtTogetherPlugin } from './plugins/frequently-bought-together/frequently-bought-together.plugin';
import { calculateAssociationsTask } from './plugins/frequently-bought-together/tasks/calculate-associations.task';

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
    schedulerOptions: {
        // Register scheduled tasks for Admin UI visibility
        tasks: [
            autoExpireBundlesTask,
            bundleConsistencyCheckTask,
            calculateAssociationsTask,
        ],
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler, codPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {
        Product: [
            // Bundle shell product fields
            { 
                name: 'isBundle', 
                type: 'boolean', 
                nullable: true, 
                defaultValue: false, 
                label: [
                    { languageCode: LanguageCode.en, value: 'Is Bundle' },
                    { languageCode: LanguageCode.fr, value: 'Est un produit groupé' },
                    { languageCode: LanguageCode.ar, value: 'منتج مجمّع' }
                ], 
                description: [
                    { languageCode: LanguageCode.en, value: 'Managed by Bundle plugin – use Configure/Remove Bundle buttons in dashboard' },
                    { languageCode: LanguageCode.fr, value: 'Géré par le plugin Bundle – utilisez les boutons Configurer/Supprimer dans le tableau de bord' },
                    { languageCode: LanguageCode.ar, value: 'يُدار بواسطة ملحق الحزم - استخدم أزرار التكوين/الإزالة في لوحة التحكم' }
                ],
                public: true,
                readonly: true,
                ui: { component: 'readonly-text-form-input' }
            },
            { 
                name: 'bundleId', 
                type: 'string', 
                nullable: true, 
                label: [
                    { languageCode: LanguageCode.en, value: 'Bundle ID' },
                    { languageCode: LanguageCode.fr, value: 'ID du produit groupé' },
                    { languageCode: LanguageCode.ar, value: 'معرف المنتج المجمّع' }
                ], 
                description: [
                    { languageCode: LanguageCode.en, value: 'Managed automatically by Bundle plugin' },
                    { languageCode: LanguageCode.fr, value: 'Géré automatiquement par le plugin Bundle' },
                    { languageCode: LanguageCode.ar, value: 'يُدار تلقائياً بواسطة ملحق الحزم' }
                ],
                public: true,
                readonly: true,
                ui: { component: 'readonly-text-form-input' }
            }
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
            assetUrlPrefix: IS_DEV ? undefined : process.env.ASSET_URL_PREFIX || 'https://preprod.impactnutrition.com.tn/assets',
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
        // AdminUiPlugin disabled - all admin UI migrated to React Dashboard
        // AdminUiPlugin.init({
        //     route: 'admin',
        //     port: 3002,
        //     app: IS_DEV 
        //         ? compileUiExtensions({
        //               outputPath: path.join(__dirname, '../admin-ui'),
        //               extensions: [
        //                   {
        //                       extensionPath: path.join(__dirname, '../ui-extensions'),
        //                       providers: ['providers.ts'],
        //                   },
        //                   // bundleUiExtension, // Removed - migrated to React Dashboard
        //                   // rewardPointsUiExtension, // Removed - migrated to React Dashboard
        //                   // nutritionBatchUiExtension, // Removed - migrated to React Dashboard
        //               ],
        //               devMode: true,
        //           })
        //         : {
        //               path: path.join(__dirname, '../admin-ui'),
        //           },
        //     adminUiConfig: {
        //         apiHost: 'http://localhost',
        //         apiPort: serverPort,
        //     },
        // }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: path.join(__dirname, '../dist/dashboard'),
        }),
        // Custom plugin for manual customer verification
        CustomerAdminVerificationPlugin,
        // Bundle Plugin for product bundles with promotion guardrails
        BundlePlugin.init({
            // GLOBAL POLICY: Prevent double-discounting by default
            siteWidePromosAffectBundles: 'Exclude',
            
            // Optional: Set discount cap (50% max total discount)
            maxCumulativeDiscountPctForBundleChildren: 0.50,
            
            // Enable logging for debugging (set to false in production)
            logPromotionGuardDecisions: IS_DEV,
            
            // Guard mode: strict prevents double-discounting
            guardMode: 'strict',
        }),
        // Reward Points Plugin for customer loyalty
        RewardPointsPlugin,
        // Auto-create Featured collection
        FeaturedCollectionPlugin,
        // Nutrition Batch Plugin for nutrition information management
        NutritionBatchPlugin.init(),
        // Frequently Bought Together Plugin for product recommendations
        FrequentlyBoughtTogetherPlugin.init(),
        // ClicToPay Payment Gateway Plugin
        ClicToPayPlugin.init({
            enableDebugLogging: IS_DEV,
            config: {
                enabled: true,
                title: 'ClicToPay',
                description: 'Pay securely with credit/debit card',
                testMode: process.env.CLICTOPAY_TEST_MODE === 'true',
                username: process.env.CLICTOPAY_USERNAME || 'test_merchant_user',
                password: process.env.CLICTOPAY_PASSWORD || 'test_merchant_pass',
                apiUrl: process.env.CLICTOPAY_API_URL || 'https://test.clictopay.com/payment/rest',
                timeout: 30000,
                retryAttempts: 3,
                webhookSecret: process.env.CLICTOPAY_WEBHOOK_SECRET || 'clictopay_webhook_secret_123',
            },
        }),
    ],
};
