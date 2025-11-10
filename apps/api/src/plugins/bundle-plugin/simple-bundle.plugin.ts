import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { Bundle } from './entities/bundle.entity';
import { BundleItem } from './entities/bundle-item.entity';
import { BundleService } from './services/bundle.service';
import { SimpleBundleAdminResolver } from './api/simple-bundle-admin.resolver';

/**
 * Simple Bundle Plugin for Vendure v3
 * 
 * Basic CRUD operations for bundles without order manipulation
 * Admin can create and manage bundles
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [Bundle, BundleItem],
    providers: [BundleService, SimpleBundleAdminResolver],
    
    adminApiExtensions: {
        resolvers: [SimpleBundleAdminResolver],
        schema: gql`
            extend type Query {
                bundles(options: BundleListOptions): BundleList!
                bundle(id: ID!): Bundle
                validateBundleStock(bundleId: ID!, quantity: Int!): BundleStockValidation!
                bundleAnalytics(bundleId: ID!): BundleAnalytics!
            }

            extend type Mutation {
                createBundle(input: CreateBundleInput!): Bundle!
                updateBundle(input: UpdateBundleInput!): Bundle!
                deleteBundle(id: ID!): DeletionResponse!
            }

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
        `,
    },

    compatibility: '^3.0.0',
})
export class SimpleBundlePlugin {}