import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';

// Entities
import { ProductAssociation } from './entities/product-association.entity';
import { AssociationSettings } from './entities/association-settings.entity';

// Services
import { AssociationSettingsService } from './services/association-settings.service';
import { AssociationCalculationService } from './services/association-calculation.service';
import { RecommendationService } from './services/recommendation.service';

// Resolvers
import { FrequentlyBoughtTogetherAdminResolver } from './api/admin.resolver';
import { FrequentlyBoughtTogetherShopResolver } from './api/shop.resolver';

/**
 * Frequently Bought Together Plugin for Vendure
 * 
 * Analyzes order history to generate intelligent product recommendations.
 * Features:
 * - Multi-factor scoring (frequency + recency + value)
 * - Scheduled background calculation
 * - Bundle plugin integration (auto-excludes bundles)
 * - Configurable display locations (PDP, cart, checkout)
 * - Admin UI for settings management
 * 
 * @see README.md for full documentation
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    compatibility: '^3.5.0',
    
    // React Dashboard extension
    dashboard: './dashboard/fbt.index.tsx',
    
    // Register entities
    entities: [ProductAssociation, AssociationSettings],
    
    // Register services
    providers: [
        AssociationSettingsService,
        AssociationCalculationService,
        RecommendationService
    ],
    
    // Admin API extensions
    adminApiExtensions: {
        resolvers: [FrequentlyBoughtTogetherAdminResolver],
        schema: gql`
            # Settings entity
            type AssociationSettings implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                enabled: Boolean!
                jobSchedule: String!
                analysisTimeWindowDays: Int!
                minCooccurrenceThreshold: Int!
                minScoreThreshold: Float!
                maxRecommendationsPerProduct: Int!
                frequencyWeight: Float!
                recencyWeight: Float!
                valueWeight: Float!
                pdpRelatedSection: Boolean!
                pdpUnderAddToCart: Boolean!
                cartPage: Boolean!
                checkoutPage: Boolean!
                fallbackToRelatedProducts: Boolean!
                lastCalculation: DateTime
                lastCalculationDurationMs: Int
                lastCalculationAssociationsCount: Int
            }

            # Input for updating settings
            input UpdateAssociationSettingsInput {
                enabled: Boolean
                jobSchedule: String
                analysisTimeWindowDays: Int
                minCooccurrenceThreshold: Int
                minScoreThreshold: Float
                maxRecommendationsPerProduct: Int
                frequencyWeight: Float
                recencyWeight: Float
                valueWeight: Float
                pdpRelatedSection: Boolean
                pdpUnderAddToCart: Boolean
                cartPage: Boolean
                checkoutPage: Boolean
                fallbackToRelatedProducts: Boolean
            }

            # Association entity (for debugging/analytics)
            type ProductAssociation implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                sourceProductId: ID!
                targetProductId: ID!
                cooccurrenceCount: Int!
                frequencyScore: Float!
                recencyScore: Float!
                valueScore: Float!
                finalScore: Float!
                lift: Float
                lastCalculated: DateTime!
            }

            # Statistics type
            type AssociationStats {
                totalAssociations: Int!
                productsWithRecommendations: Int!
                averageRecommendationsPerProduct: Float!
                lastCalculated: DateTime
                lastCalculationDurationMs: Int
                lastCalculationAssociationsCount: Int
                enabled: Boolean!
            }

            # Calculation result
            type CalculationResult {
                success: Boolean!
                associationsCount: Int
                durationMs: Int
                message: String
            }

            extend type Query {
                "Get current association settings"
                associationSettings: AssociationSettings!
                
                "Get associations for a specific product (admin analytics)"
                productAssociations(productId: ID!): [ProductAssociation!]!
                
                "Get statistics about associations"
                associationStats: AssociationStats!
            }

            extend type Mutation {
                "Update association settings"
                updateAssociationSettings(input: UpdateAssociationSettingsInput!): AssociationSettings!
                
                "Reset settings to defaults"
                resetAssociationSettings: AssociationSettings!
                
                "Manually trigger association calculation"
                triggerAssociationCalculation: CalculationResult!
            }
        `
    },
    
    // Shop API extensions
    shopApiExtensions: {
        resolvers: [FrequentlyBoughtTogetherShopResolver],
        schema: gql`
            enum DisplayContext {
                PDP_RELATED
                PDP_ADD_TO_CART
                CART
                CHECKOUT
            }

            extend type Query {
                "Get recommendations for a product"
                frequentlyBoughtTogether(
                    productId: ID!
                    context: String
                ): [Product!]!
                
                "Get recommendations for cart items"
                cartRecommendations(
                    productIds: [ID!]!
                ): [Product!]!
            }
        `
    }
})
export class FrequentlyBoughtTogetherPlugin {
    static init(options?: any) {
        return FrequentlyBoughtTogetherPlugin;
    }
}
