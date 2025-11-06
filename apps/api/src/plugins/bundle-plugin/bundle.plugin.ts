import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { Bundle } from './entities/bundle.entity';
import { BundleItem } from './entities/bundle-item.entity';
import { BundleService } from './services/bundle.service';
import { BundleOrderService } from './services/bundle-order.service';
import { ShopApiBundleResolver, AdminApiBundleResolver } from './api/bundle-v3.resolver';
import { BundleAdminResolver } from './api/bundle-admin.resolver';

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
    imports: [PluginCommonModule],
    
    // Register custom entities
    entities: [Bundle, BundleItem],
    
    // Register services
    providers: [BundleService, BundleOrderService],
    
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
                assets: [String!]!
                price: Money!
                enabled: Boolean!
                tags: [String!]
                category: String
                items: [BundleItem!]!
            }

            type BundleItem implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                productVariant: ProductVariant!
                quantity: Int!
                unitPrice: Money!
                displayOrder: Int
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
                name: StringOperators
                category: StringOperators
            }

            extend type Query {
                bundle(id: ID!): Bundle
                bundles(options: BundleListOptions): BundleList!
            }

            extend type Mutation {
                addBundleToOrder(bundleId: ID!, quantity: Int!): Order
                adjustBundleInOrder(orderLineId: ID!, quantity: Int!): Order
                removeBundleFromOrder(orderLineId: ID!): Order
            }

            extend type Order {
                bundleGroups: [BundleGroup!]!
            }

        `,
    },

    adminApiExtensions: {
        resolvers: [BundleAdminResolver, AdminApiBundleResolver],
        schema: gql`
            type Bundle implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                name: String!
                slug: String
                description: String
                assets: [String!]!
                price: Money!
                enabled: Boolean!
                tags: [String!]
                category: String
                items: [BundleItem!]!
            }

            type BundleItem implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                productVariant: ProductVariant!
                quantity: Int!
                unitPrice: Money!
                displayOrder: Int
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

            extend type Query {
                bundles(options: BundleListOptions): BundleList!
                bundle(id: ID!): Bundle
                validateBundleStock(bundleId: ID!, quantity: Int!): BundleStockValidation!
                bundleAnalytics(bundleId: ID!): BundleAnalytics!
                detectBundleOpportunitiesInOrder(orderId: ID!): [BundleOpportunity!]!
                getBundleUsageStats: BundleUsageStats!
            }

            extend type Mutation {
                createBundle(input: CreateBundleInput!): Bundle!
                updateBundle(input: UpdateBundleInput!): Bundle!
                deleteBundle(id: ID!): BundleDeletionResponse!
            }

            type BundleDeletionResponse {
                result: String!
                message: String
            }

            input CreateBundleInput {
                name: String!
                slug: String
                description: String
                assets: [String!]!
                price: Money!
                enabled: Boolean!
                tags: [String!]
                category: String
                items: [CreateBundleItemInput!]!
            }

            input UpdateBundleInput {
                id: ID!
                name: String
                slug: String
                description: String
                assets: [String!]
                price: Money
                enabled: Boolean
                tags: [String!]
                category: String
                items: [UpdateBundleItemInput!]
            }

            input CreateBundleItemInput {
                productVariantId: ID!
                quantity: Int!
                unitPrice: Money!
                displayOrder: Int
            }

            input UpdateBundleItemInput {
                id: ID
                productVariantId: ID!
                quantity: Int!
                unitPrice: Money!
                displayOrder: Int
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
        `,
    },

    // Add custom fields to OrderLine for bundle grouping
    configuration: config => {
        config.customFields.OrderLine = [
            {
                name: 'bundleParent',
                type: 'boolean',
                defaultValue: false,
                internal: true,
            },
            {
                name: 'bundleId',
                type: 'string',
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
            },
        ];
        return config;
    },
})
export class BundlePlugin {}

export * from './entities/bundle.entity';
export * from './entities/bundle-item.entity';
export * from './services/bundle.service';
export * from './ui/bundle-ui-extension';
