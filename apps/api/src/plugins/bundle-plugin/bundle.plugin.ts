import { PluginCommonModule, VendurePlugin, LanguageCode } from '@vendure/core';
import { ScheduleModule } from '@nestjs/schedule';
import { gql } from 'graphql-tag';
import { Bundle } from './entities/bundle.entity';
import { BundleItem } from './entities/bundle-item.entity';
import { BundleService } from './services/bundle.service';
import { BundleOrderService } from './services/bundle-order.service';
import { BundlePromotionGuardService } from './services/bundle-promotion-guard.service';
import { BundleConfigService } from './services/bundle-config.service';
// import { BundlePromotionInterceptor } from './promotions/bundle-promotion-interceptor'; // Disabled - requires core module access
import { BundleSafetyService } from './services/bundle-safety.service';
import { BundleLifecycleService } from './services/bundle-lifecycle.service';
import { BundleReservationService } from './services/bundle-reservation.service';
import { BundlePromotionSetupService } from './services/bundle-promotion-setup.service';
import { ShopApiBundleResolver, AdminApiBundleResolver } from './api/bundle-v3.resolver';
import { BundleAdminResolver } from './api/bundle-admin.resolver';
import { applyBundleLineAdjustments } from './promotions/bundle-line-adjustment.action';
import { hasBundleLines } from './promotions/has-bundle-lines.condition';
import { bundleAwarePercentageDiscount } from './promotions/bundle-aware-percentage-discount.action';
import { bundleAwareFixedDiscount } from './promotions/bundle-aware-fixed-discount.action';
import { BundleJobQueueService } from './services/bundle-job-queue.service';
import { BundlePluginConfig, defaultBundlePluginConfig } from './types/bundle-config.types';
import { BundleSchedulerService } from './services/bundle-scheduler.service';
import { BundleEventHandlersService } from './services/bundle-event-handlers.service';
import { BundleJobQueueResolver } from './api/bundle-job-queue.resolver';
import { BundleTranslationService } from './services/bundle-translation.service';

/**
 * Bundle Plugin for Vendure
 * 
 * Implements "exploded bundles" as specified in Bundle Plugin documentation:
 * - Bundles appear as single priced line items
 * - Components are hidden/grouped zero-priced child lines
 * - Stock consumption occurs on child variants only
 * - Supports bundle-specific promotions and pricing
 * 
 * Features:
 * - Bundle entity and data model
 * - GraphQL API extensions (Shop + Admin)
 * - Order processing integration
 * - Stock validation and management
 * - Admin UI dashboard extensions
 */
@VendurePlugin({
    imports: [PluginCommonModule, ScheduleModule.forRoot()],
    compatibility: '^3.5.0',
    
    // Register custom entities
    entities: [Bundle, BundleItem],
    
    // Register services
    providers: [
        BundleService, 
        BundleOrderService,
        BundlePromotionGuardService,
        BundleConfigService,
        // BundlePromotionInterceptor, // Disabled - requires access to PromotionService from core
        BundleSafetyService,
        BundleLifecycleService,
        // Phase 4.3: Background jobs and consistency
        BundleJobQueueService,
        BundleSchedulerService,
        BundleEventHandlersService,
        // Phase 2 v3: Reservation system
        BundleReservationService,
        // Automatic bundle discount promotion setup
        BundlePromotionSetupService,
        // Internationalization
        BundleTranslationService
    ],
    
    // Register GraphQL resolvers
    shopApiExtensions: {
        resolvers: [ShopApiBundleResolver],
        schema: gql`
            type Bundle implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                name: String!
                slug: String
                description: String
                status: String!
                discountType: String!
                fixedPrice: Money
                percentOff: Float
                version: Int!
                assets: [Asset!]!
                featuredAsset: Asset
                tags: [String!]
                category: String
                allowExternalPromos: Boolean!
                validFrom: DateTime
                validTo: DateTime
                bundleCap: Int
                bundleReservedOpen: Int!
                bundleVirtualStock: Int
                shellProductId: String
                shellProduct: Product
                items: [BundleItem!]!
                # Computed fields
                isAvailable: Boolean!
                effectivePrice: Money!
                totalSavings: Money!
            }

            type BundleItem implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                productVariant: ProductVariant!
                quantity: Int!
                unitPrice: Money! # Legacy compatibility
                unitPriceSnapshot: Money!
                weight: Float
                displayOrder: Int!
            }

            type BundleGroup {
                parentLine: OrderLine!
                childLines: [OrderLine!]!
                bundle: Bundle!
            }

            input BundleListOptions {
                skip: Int
                take: Int
                sort: BundleSortParameter
                filter: BundleFilterParameter
            }

            type BundleList implements PaginatedList {
                items: [Bundle!]!
                totalItems: Int!
            }

            input BundleSortParameter {
                id: SortOrder
                createdAt: SortOrder
                updatedAt: SortOrder
                name: SortOrder
                price: SortOrder
            }

            input BundleFilterParameter {
                enabled: BooleanOperators
                status: StringOperators
                name: StringOperators
                category: StringOperators
            }
            
            type BundleAvailability {
                isAvailable: Boolean!
                maxQuantity: Int!
                status: String!
                reason: String
            }
            
            type BundleMutationResult {
                success: Boolean!
                bundleKey: String
                error: String
                availabilityError: BundleAvailabilityError
            }
            
            type BundleAvailabilityError {
                bundleName: String!
                maxAvailable: Int!
                insufficientItems: [InsufficientStockItem!]!
            }
            
            type InsufficientStockItem {
                variantId: ID!
                productName: String!
                required: Int!
                available: Int!
                shortfall: Int!
            }
            
            type BundleOpportunity {
                bundle: Bundle!
                matches: [BundleItem!]!
                missing: [BundleItem!]!
                canComplete: Boolean!
                potentialSavings: Money!
            }
            
            type BundleUsageStats {
                totalBundlesSold: Int!
                topPerformingBundles: [Bundle!]!
                averageSavingsPerBundle: Money!
                bundleConversionRate: Float!
            }
            
            type BundleIntegrityValidation {
                isValid: Boolean!
                issues: [BundleIntegrityIssue!]!
            }
            
            type BundleIntegrityIssue {
                type: String!
                variantId: ID!
                message: String!
            }
            
            type BundleLifecycleResult {
                success: Boolean!
                bundle: Bundle
                error: String
            }
            
            type VariantDeletionCheck {
                canDelete: Boolean!
                blockingBundles: [Bundle!]!
            }
            
            type BundleLifecycleStats {
                totalBundles: Int!
                activeCount: Int!
                draftCount: Int!
                brokenCount: Int!
                archivedCount: Int!
                recentlyModified: [Bundle!]!
            }

            extend type Query {
                bundle(id: ID!): Bundle
                bundles(options: BundleListOptions): BundleList!
                bundleAvailability(bundleId: ID!): BundleAvailability!
                detectBundleOpportunitiesInOrder(orderId: ID!): [BundleOpportunity!]!
                getBundleUsageStats: BundleUsageStats!
                validateBundleIntegrity(id: ID!): BundleIntegrityValidation!
                canDeleteVariant(variantId: ID!): VariantDeletionCheck!
                getBundleLifecycleStatistics: BundleLifecycleStats!
            }

            extend type Mutation {
                addBundleToOrder(bundleId: ID!, quantity: Int!): Order
                adjustBundleInOrder(bundleKey: String!, quantity: Int!): Order
                removeBundleFromOrder(bundleKey: String!): Order
                publishBundle(id: ID!): BundleLifecycleResult!
                archiveBundle(id: ID!, reason: String): BundleLifecycleResult!
                markBundleBroken(id: ID!, reason: String!): BundleLifecycleResult!
                restoreBundle(id: ID!): BundleLifecycleResult!
            }

            extend type Order {
                bundleGroups: [BundleGroup!]!
            }

        `,
    },

    adminApiExtensions: {
        resolvers: [BundleAdminResolver, AdminApiBundleResolver, BundleJobQueueResolver],
        schema: gql`
            type Bundle implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                name: String!
                slug: String
                description: String
                status: String!
                discountType: String!
                fixedPrice: Money
                percentOff: Float
                version: Int!
                assets: [Asset!]!
                featuredAsset: Asset
                tags: [String!]
                category: String
                allowExternalPromos: Boolean!
                validFrom: DateTime
                validTo: DateTime
                bundleCap: Int
                bundleReservedOpen: Int!
                bundleVirtualStock: Int
                shellProductId: String
                shellProduct: Product
                items: [BundleItem!]!
                # Computed fields
                isAvailable: Boolean!
                effectivePrice: Money!
                totalSavings: Money!
            }

            type BundleItem implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                productVariant: ProductVariant!
                quantity: Int!
                unitPrice: Money! # Legacy compatibility
                unitPriceSnapshot: Money!
                weight: Float
                displayOrder: Int!
            }

            input BundleListOptions {
                skip: Int
                take: Int
                sort: BundleSortParameter
                filter: BundleFilterParameter
            }

            type BundleList implements PaginatedList {
                items: [Bundle!]!
                totalItems: Int!
            }

            input BundleSortParameter {
                id: SortOrder
                createdAt: SortOrder
                updatedAt: SortOrder
                name: SortOrder
                price: SortOrder
            }

            input BundleFilterParameter {
                enabled: BooleanOperators
                name: StringOperators
                category: StringOperators
            }
            
            # Admin-specific types (avoid conflicts with shop API types)
            type AdminBundleOpportunity {
                suggestedBundle: Bundle!
                potentialSavings: Money!
                matchingItems: [String!]!  # Order line references
            }
            
            type AdminBundleUsageStats {
                totalBundlesSold: Int!
                topPerformingBundles: [Bundle!]!
                averageSavingsPerBundle: Money!
                bundleConversionRate: Float!
                reportingPeriod: String!
            }

            extend type Query {
                bundles(options: BundleListOptions): BundleList!
                bundle(id: ID!): Bundle
                detectBundleOpportunitiesInOrder(orderId: ID!): [AdminBundleOpportunity!]!
                getBundleUsageStats: AdminBundleUsageStats!
            }

            extend type Mutation {
                createBundle(input: CreateBundleInput!): Bundle!
                updateBundle(input: UpdateBundleInput!): Bundle!
                deleteBundle(id: ID!): BundleDeletionResponse!
                
                # Bundle v2 lifecycle operations
                publishBundle(id: ID!): Bundle!
                archiveBundle(id: ID!, reason: String): Bundle!
                markBundleBroken(id: ID!, reason: String!): Bundle!
                restoreBundle(id: ID!): Bundle!
                
                # Phase 4.2: Bundle validation and safety (moved to Query)
                
                # Phase 4.3: Job queue and consistency management (via Vendure's job system)
                triggerBundleConsistencyCheck(scope: String): BundleJobResult!
                recomputeBundle(bundleId: ID!, options: BundleRecomputeOptions): BundleJobResult!
                reindexBundleProduct(bundleId: ID!, fullReindex: Boolean): BundleJobResult!
                bulkRecomputeBundles(bundleIds: [ID!]!, batchSize: Int): BundleBulkJobResult!
                emergencyBundleConsistencyCheck(scope: String): BundleJobResult!
            }

            type BundleDeletionResponse {
                result: String!
                message: String
            }

            input CreateBundleInput {
                name: String!
                slug: String
                description: String
                discountType: String!
                fixedPrice: Money
                percentOff: Float
                assets: [ID!]
                tags: [String!]
                category: String
                allowExternalPromos: Boolean
                # Phase 3 fields
                validFrom: DateTime
                validTo: DateTime
                bundleCap: Int
                items: [CreateBundleItemInput!]!
                # Legacy compatibility
                price: Money
                enabled: Boolean
            }

            input UpdateBundleInput {
                id: ID!
                name: String
                slug: String
                description: String
                discountType: String
                fixedPrice: Money
                percentOff: Float
                assets: [ID!]
                tags: [String!]
                category: String
                allowExternalPromos: Boolean
                # Phase 3 fields
                validFrom: DateTime
                validTo: DateTime
                bundleCap: Int
                items: [UpdateBundleItemInput!]
                # Legacy compatibility
                price: Money
                enabled: Boolean
            }

            input CreateBundleItemInput {
                productVariantId: ID!
                quantity: Int!
                weight: Float
                displayOrder: Int
                # Legacy compatibility
                unitPrice: Money
            }

            input UpdateBundleItemInput {
                id: ID
                productVariantId: ID!
                quantity: Int!
                weight: Float
                displayOrder: Int
                # Legacy compatibility
                unitPrice: Money
            }

            type BundleStockValidation {
                valid: Boolean!
                constrainingVariants: [ProductVariant!]!
                maxQuantityAvailable: Int!
                message: String
            }

            type BundleAnalytics {
                bundleId: ID!
                totalComponents: Int!
                componentTotal: Money!
                bundlePrice: Money!
                totalSavings: Money!
                savingsPercentage: Float!
                totalWeight: Float!
                enabled: Boolean!
                availabilityStatus: BundleStockValidation!
            }

            type BundleOpportunity {
                suggestedBundle: Bundle!
                potentialSavings: Money!
                matchingItems: [OrderLine!]!
            }

            type BundleUsageStats {
                totalBundlesSold: Int!
                topPerformingBundles: [Bundle!]!
                averageSavingsPerBundle: Money!
                bundleConversionRate: Float!
            }
            
            # Phase 4.2: Bundle validation and lifecycle types
            type BundleIntegrityResult {
                isValid: Boolean!
                issues: [BundleIntegrityIssue!]!
            }
            
            type BundleIntegrityIssue {
                type: String!
                variantId: ID!
                message: String!
            }
            
            type VariantDeletionCheck {
                canDelete: Boolean!
                blockingBundles: [BundleReference!]!
            }
            
            type BundleReference {
                id: ID!
                name: String!
                status: String!
            }
            
            type BundleLifecycleStats {
                totalBundles: Int!
                draftBundles: Int!
                activeBundles: Int!
                brokenBundles: Int!
                archivedBundles: Int!
                recentTransitions: [BundleTransition!]!
            }
            
            type BundleTransition {
                bundleId: ID!
                bundleName: String!
                fromStatus: String!
                toStatus: String!
                timestamp: DateTime!
                reason: String
            }
            
            # Phase 4.3: Job queue types (jobs visible in Admin → System → Jobs)
            type BundleJobResult {
                jobId: String!
                message: String!
            }
            
            type BundleBulkJobResult {
                jobIds: [String!]!
                totalBundles: Int!
                batchCount: Int!
                message: String!
            }
            
            input BundleRecomputeOptions {
                forceRecalculation: Boolean
                updateSearch: Boolean
                reason: String
            }
            
            type BundleConfig {
                siteWidePromosAffectBundles: String!
                maxCumulativeDiscountPctForBundleChildren: Float!
            }
            
            input UpdateBundleConfigInput {
                siteWidePromosAffectBundles: String
                maxCumulativeDiscountPctForBundleChildren: Float
            }
            
            extend type Query {
                bundleConfig: BundleConfig!
            }
            
            extend type Mutation {
                updateBundleConfig(input: UpdateBundleConfigInput!): BundleConfig!
            }
        `,
    },

    // Add custom fields to OrderLine for bundle grouping and register promotion components
    configuration: config => {
        config.customFields.OrderLine = [
            // Bundle identification fields (exposed for frontend grouping)
            {
                name: 'bundleKey',
                type: 'string',
                public: true,
            },
            {
                name: 'bundleId',
                type: 'string',
                public: true,
            },
            {
                name: 'bundleName',
                type: 'string',
                public: true,
            },
            {
                name: 'bundleVersion',
                type: 'int',
                internal: true,
            },
            {
                name: 'discountType',
                type: 'string',
                internal: true,
            },
            // Bundle structure fields
            {
                name: 'isBundleHeader',
                type: 'boolean',
                defaultValue: false,
                public: true,
            },
            {
                name: 'bundleComponentQty',
                type: 'int',
                public: true,
                nullable: true,
            },
            // Pricing fields
            {
                name: 'baseUnitPrice',
                type: 'int',
                internal: true,
            },
            {
                name: 'effectiveUnitPrice',
                type: 'int',
                internal: true,
            },
            {
                name: 'bundlePctApplied',
                type: 'float',
                internal: true,
                nullable: true,
            },
            {
                name: 'bundleAdjAmount',
                type: 'int',
                internal: true,
                nullable: true,
            },
            {
                name: 'bundleShare',
                type: 'float',
                internal: true,
                nullable: true,
            },
            {
                name: 'bundleTotalPreDiscount',
                type: 'int',
                internal: true,
                nullable: true,
            },
            {
                name: 'bundleTotalPrice',
                type: 'int',
                internal: true,
                nullable: true,
            },
            {
                name: 'bundleTotalDiscount',
                type: 'int',
                internal: true,
                nullable: true,
            },
            // Component fields
            {
                name: 'componentWeight',
                type: 'float',
                internal: true,
                nullable: true,
            },
            {
                name: 'subtotalPreDiscount',
                type: 'int',
                internal: true,
                nullable: true,
            },
            // Legacy fields for compatibility
            {
                name: 'bundleParent',
                type: 'boolean',
                defaultValue: false,
                internal: true,
            },
            {
                name: 'bundleChild',
                type: 'boolean',
                defaultValue: false,
                internal: true,
            },
            {
                name: 'bundleParentLineId',
                type: 'string',
                internal: true,
                nullable: true,
            },
        ];
        
        // Add custom fields to GlobalSettings for runtime configuration
        config.customFields.GlobalSettings = [
            ...(config.customFields.GlobalSettings || []),
            {
                name: 'bundleSiteWidePromosAffectBundles',
                type: 'string',
                options: [
                    { value: 'Exclude' },
                    { value: 'Allow' }
                ],
                defaultValue: 'Exclude',
                label: [{
                    languageCode: LanguageCode.en,
                    value: 'Site-wide Promotions Affect Bundles'
                }],
                description: [{
                    languageCode: LanguageCode.en,
                    value: 'Whether external promotions and coupon codes can apply to bundles (Exclude = safe, Allow = risky)'
                }],
                public: false,
                internal: true
            },
            {
                name: 'bundleMaxCumulativeDiscountPct',
                type: 'float',
                defaultValue: 0.50,
                label: [{
                    languageCode: LanguageCode.en,
                    value: 'Bundle Max Cumulative Discount (%)'
                }],
                description: [{
                    languageCode: LanguageCode.en,
                    value: 'Maximum combined discount percentage allowed on bundle child items (e.g., 0.50 = 50%)'
                }],
                public: false,
                internal: true,
                validate: (value: number) => {
                    if (value < 0 || value > 1) {
                        return 'Must be between 0 and 1 (e.g., 0.50 for 50%)';
                    }
                }
            }
        ];
        
        // Add custom fields to Promotion for bundle promotion policies
        config.customFields.Promotion = [
            ...(config.customFields.Promotion || []),
            {
                name: 'bundlePolicy',
                type: 'string',
                options: [
                    { value: 'inherit' },
                    { value: 'never' },
                    { value: 'always' }
                ],
                defaultValue: 'inherit',
                label: [{
                    languageCode: LanguageCode.en,
                    value: 'Bundle Policy'
                }],
                description: [{
                    languageCode: LanguageCode.en,
                    value: 'How this promotion interacts with bundle components'
                }]
            },
            {
                name: 'bundleAware',
                type: 'boolean',
                defaultValue: false,
                label: [{
                    languageCode: LanguageCode.en,
                    value: 'Bundle Aware'
                }],
                description: [{
                    languageCode: LanguageCode.en,
                    value: 'Whether this promotion is designed to work with bundles'
                }]
            }
        ];
        
        // Register bundle promotion components
        config.promotionOptions = config.promotionOptions || {};
        config.promotionOptions.promotionActions = [
            ...(config.promotionOptions.promotionActions || []),
            applyBundleLineAdjustments,
            bundleAwarePercentageDiscount,
            bundleAwareFixedDiscount,
        ];
        config.promotionOptions.promotionConditions = [
            ...(config.promotionOptions.promotionConditions || []),
            hasBundleLines,
        ];
        
        return config;
    },
})
export class BundlePlugin {
    private static config: BundlePluginConfig = defaultBundlePluginConfig;
    
    /**
     * Initialize the Bundle Plugin with custom configuration
     * 
     * @example
     * ```typescript
     * BundlePlugin.init({
     *   siteWidePromosAffectBundles: 'Exclude',
     *   maxCumulativeDiscountPctForBundleChildren: 0.50,
     *   guardMode: 'strict',
     *   logPromotionGuardDecisions: true
     * })
     * ```
     */
    static init(config?: Partial<BundlePluginConfig>): typeof BundlePlugin {
        if (config) {
            BundlePlugin.config = { ...defaultBundlePluginConfig, ...config };
        }
        return BundlePlugin;
    }
    
    /**
     * Get the current plugin configuration
     */
    static getConfig(): BundlePluginConfig {
        return BundlePlugin.config;
    }
}

export * from './entities/bundle.entity';
export * from './entities/bundle-item.entity';
export * from './services/bundle.service';
export * from './services/bundle-promotion-guard.service';
export * from './services/bundle-safety.service';
export * from './services/bundle-lifecycle.service';
export * from './promotions/bundle-promotion-interceptor';
export * from './types/bundle-config.types';
export * from './ui/bundle-ui-extension';

// Type declarations in types/custom-fields.d.ts are automatically loaded by TypeScript
