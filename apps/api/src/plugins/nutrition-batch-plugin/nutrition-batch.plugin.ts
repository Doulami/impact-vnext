import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { NutritionBatch } from './entities/nutrition-batch.entity';
import { NutritionBatchTranslation } from './entities/nutrition-batch-translation.entity';
import { NutritionBatchRow } from './entities/nutrition-batch-row.entity';
import { NutritionBatchRowTranslation } from './entities/nutrition-batch-row-translation.entity';
import { NutritionBatchService } from './services/nutrition-batch.service';
import { NutritionBatchRowService } from './services/nutrition-batch-row.service';
import { NutritionLocaleService } from './services/nutrition-locale.service';
import { NutritionBatchAdminResolver, NutritionBatchShopResolver, NutritionBatchRowShopResolver } from './api/nutrition-batch.resolver';
import { ProductVariantNutritionResolver } from './api/product-variant.resolver';

/**
 * Nutrition Batch Plugin for Vendure
 * 
 * Manages nutrition information, ingredients, and regulatory texts for Product Variants.
 * Each variant can have multiple batches with one active on the website.
 * 
 * Features:
 * - Multiple batches per variant with serving definitions
 * - Structured nutrition tables with AR/RI percentages
 * - Localized regulatory texts (ingredients, allergens, usage, storage, warnings)
 * - Certificate of Analysis (COA) support
 * - Full Admin UI and Shop API
 * - Internationalization support
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    compatibility: '^3.5.0',
    dashboard: './dashboard/nutrition-batch.index.tsx',
    
    // Register custom entities
    entities: [NutritionBatch, NutritionBatchTranslation, NutritionBatchRow, NutritionBatchRowTranslation],
    
    // Register services
    providers: [
        NutritionBatchService,
        NutritionBatchRowService,
        NutritionLocaleService
    ],
    
    // Admin API extensions
    adminApiExtensions: {
        resolvers: [NutritionBatchAdminResolver],
        schema: gql`
            # Enums
            enum ServingSizeUnit {
                g
                ml
                tablet
                capsule
                scoop
                sachet
                dosette
                piece
                serving
            }
            
            enum NutrientGroup {
                macro
                vitamin
                mineral
                amino
                other
            }
            
            # Types
            type NutritionBatchList implements PaginatedList {
                items: [NutritionBatch!]!
                totalItems: Int!
            }
            
            type NutritionBatchTranslation {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                languageCode: LanguageCode!
                servingLabel: String
                ingredientsText: String
                allergyAdviceText: String
                recommendedUseText: String
                storageAdviceText: String
                warningsText: String
                shortLabelDescription: String
                referenceIntakeFootnoteText: String
            }
            
            type NutritionBatch implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                productVariant: ProductVariant!
                productVariantId: ID!
                batchCode: String!
                productionDate: DateTime
                expiryDate: DateTime
                isCurrentForWebsite: Boolean!
                languageCode: LanguageCode!
                translations: [NutritionBatchTranslation!]!
                
                # Serving information
                servingSizeValue: Float!
                servingSizeUnit: ServingSizeUnit!
                servingLabel: String
                servingsPerContainer: Int
                
                # Regulatory texts (localized)
                ingredientsText: String
                allergyAdviceText: String
                recommendedUseText: String
                storageAdviceText: String
                warningsText: String
                shortLabelDescription: String
                referenceIntakeFootnoteText: String
                
                # Internal
                notesInternal: String
                coaAsset: Asset
                
                # Nutrition table
                rows: [NutritionBatchRow!]!
            }
            
            type NutritionBatchRowTranslation {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                languageCode: LanguageCode!
                name: String!
            }
            
            type NutritionBatchRow implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                nutritionBatch: NutritionBatch!
                languageCode: LanguageCode!
                translations: [NutritionBatchRowTranslation!]!
                name: String!
                group: NutrientGroup!
                unit: String!
                valuePerServing: Float
                valuePer100g: Float
                referenceIntakePercentPerServing: Float
                displayOrder: Int!
            }
            
            # Input types
            input NutritionBatchTranslationInput {
                id: ID
                languageCode: LanguageCode!
                servingLabel: String
                ingredientsText: String
                allergyAdviceText: String
                recommendedUseText: String
                storageAdviceText: String
                warningsText: String
                shortLabelDescription: String
                referenceIntakeFootnoteText: String
            }
            
            input CreateNutritionBatchInput {
                productVariantId: ID!
                batchCode: String!
                productionDate: DateTime
                expiryDate: DateTime
                isCurrentForWebsite: Boolean!
                servingSizeValue: Float!
                servingSizeUnit: ServingSizeUnit!
                servingsPerContainer: Int
                translations: [NutritionBatchTranslationInput!]!
                notesInternal: String
                coaAssetId: ID
            }
            
            input UpdateNutritionBatchInput {
                batchCode: String
                productionDate: DateTime
                expiryDate: DateTime
                isCurrentForWebsite: Boolean
                servingSizeValue: Float
                servingSizeUnit: ServingSizeUnit
                servingsPerContainer: Int
                translations: [NutritionBatchTranslationInput!]
                notesInternal: String
                coaAssetId: ID
            }
            
            input NutritionBatchRowTranslationInput {
                id: ID
                languageCode: LanguageCode!
                name: String!
            }
            
            input CreateNutritionBatchRowInput {
                translations: [NutritionBatchRowTranslationInput!]!
                group: NutrientGroup!
                unit: String!
                valuePerServing: Float
                valuePer100g: Float
                referenceIntakePercentPerServing: Float
                displayOrder: Int
            }
            
            input UpdateNutritionBatchRowInput {
                translations: [NutritionBatchRowTranslationInput!]
                group: NutrientGroup
                unit: String
                valuePerServing: Float
                valuePer100g: Float
                referenceIntakePercentPerServing: Float
                displayOrder: Int
            }
            
            input NutritionBatchListOptions {
                skip: Int
                take: Int
                sort: NutritionBatchSortParameter
                filter: NutritionBatchFilterParameter
            }
            
            input NutritionBatchSortParameter {
                id: SortOrder
                createdAt: SortOrder
                updatedAt: SortOrder
                batchCode: SortOrder
                productionDate: SortOrder
                expiryDate: SortOrder
            }
            
            input NutritionBatchFilterParameter {
                batchCode: StringOperators
                productionDate: DateOperators
                expiryDate: DateOperators
                isCurrentForWebsite: BooleanOperators
            }
            
            # Queries
            extend type Query {
                nutritionBatches(options: NutritionBatchListOptions, variantId: ID!): NutritionBatchList!
                nutritionBatch(id: ID!): NutritionBatch
                currentNutritionBatch(variantId: ID!): NutritionBatch
                nutritionBatchRows(batchId: ID!): [NutritionBatchRow!]!
            }
            
            # Mutations
            extend type Mutation {
                createNutritionBatch(input: CreateNutritionBatchInput!): NutritionBatch!
                updateNutritionBatch(id: ID!, input: UpdateNutritionBatchInput!): NutritionBatch!
                deleteNutritionBatch(id: ID!): DeletionResponse!
                setCurrentNutritionBatch(batchId: ID!): NutritionBatch!
                duplicateNutritionBatch(id: ID!): NutritionBatch!
                
                createNutritionBatchRow(batchId: ID!, input: CreateNutritionBatchRowInput!): NutritionBatchRow!
                updateNutritionBatchRow(id: ID!, input: UpdateNutritionBatchRowInput!): NutritionBatchRow!
                deleteNutritionBatchRow(id: ID!): DeletionResponse!
                createDefaultMacroRows(batchId: ID!): [NutritionBatchRow!]!
            }
        `
    },
    
    // Shop API extensions (read-only access for storefront)
    shopApiExtensions: {
        resolvers: [NutritionBatchShopResolver, NutritionBatchRowShopResolver, ProductVariantNutritionResolver],
        schema: gql`
            # Enums
            enum ServingSizeUnit {
                g
                ml
                tablet
                capsule
                scoop
                sachet
                dosette
                piece
                serving
            }
            
            enum NutrientGroup {
                macro
                vitamin
                mineral
                amino
                other
            }
            
            # Types
            type NutritionBatch implements Node {
                id: ID!
                createdAt: DateTime!
                updatedAt: DateTime!
                productVariant: ProductVariant!
                batchCode: String!
                productionDate: DateTime
                expiryDate: DateTime
                
                # Serving information
                servingSizeValue: Float!
                servingSizeUnit: ServingSizeUnit!
                servingLabel: String
                servingsPerContainer: Int
                
                # Regulatory texts (localized, filtered by request language)
                ingredientsText: String
                allergyAdviceText: String
                recommendedUseText: String
                storageAdviceText: String
                warningsText: String
                shortLabelDescription: String
                referenceIntakeFootnoteText: String
                
                # Nutrition table
                rows: [NutritionBatchRow!]!
            }
            
            type NutritionBatchRow implements Node {
                id: ID!
                name: String!
                group: NutrientGroup!
                unit: String!
                valuePerServing: Float
                valuePer100g: Float
                referenceIntakePercentPerServing: Float
                displayOrder: Int!
            }
            
            # Extend ProductVariant with nutrition data
            extend type ProductVariant {
                nutritionBatches: [NutritionBatch!]!
                currentNutritionBatch: NutritionBatch
            }
            
            # Queries
            extend type Query {
                currentNutritionBatch(variantId: ID!): NutritionBatch
                nutritionBatches(variantId: ID!): [NutritionBatch!]!
            }
        `
    }
})
export class NutritionBatchPlugin {
    /**
     * Initialize plugin with optional configuration
     */
    static init(options?: any): typeof NutritionBatchPlugin {
        return NutritionBatchPlugin;
    }
}
