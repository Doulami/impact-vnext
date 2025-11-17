/**
 * Nutrition Batch Plugin - Type Definitions
 */

import { ID } from '@vendure/common/lib/shared-types';

/**
 * Serving Size Unit Enum
 * Defines the units for serving size measurements
 */
export enum ServingSizeUnit {
    GRAM = 'g',
    MILLILITER = 'ml',
    TABLET = 'tablet',
    CAPSULE = 'capsule',
    SCOOP = 'scoop',
    SACHET = 'sachet',
    DOSETTE = 'dosette',
    PIECE = 'piece',
    SERVING = 'serving'
}

/**
 * Nutrient Group Enum
 * Categorizes nutrients for table organization
 */
export enum NutrientGroup {
    MACRO = 'macro',           // Energy, Protein, Carbs, Fat, Salt
    VITAMIN = 'vitamin',       // Vitamins
    MINERAL = 'mineral',       // Minerals
    AMINO = 'amino',           // Amino acids
    OTHER = 'other'            // Other nutrients
}

/**
 * Input type for creating a nutrition batch
 */
export interface CreateNutritionBatchInput {
    productVariantId: ID;
    batchCode: string;
    productionDate?: Date;
    expiryDate?: Date;
    isCurrentForWebsite: boolean;
    
    // Serving information
    servingSizeValue: number;
    servingSizeUnit: ServingSizeUnit;
    servingLabel: Record<string, string>;
    servingsPerContainer?: number;
    
    // Regulatory texts (localized as JSON objects)
    ingredientsText?: Record<string, string>;
    allergyAdviceText?: Record<string, string>;
    recommendedUseText?: Record<string, string>;
    storageAdviceText?: Record<string, string>;
    warningsText?: Record<string, string>;
    shortLabelDescription?: Record<string, string>;
    referenceIntakeFootnoteText?: Record<string, string>;
    
    // Internal
    notesInternal?: string;
    coaAssetId?: ID;
}

/**
 * Input type for updating a nutrition batch
 */
export interface UpdateNutritionBatchInput {
    batchCode?: string;
    productionDate?: Date;
    expiryDate?: Date;
    isCurrentForWebsite?: boolean;
    
    // Serving information
    servingSizeValue?: number;
    servingSizeUnit?: ServingSizeUnit;
    servingLabel?: Record<string, string>;
    servingsPerContainer?: number;
    
    // Regulatory texts (localized as JSON objects)
    ingredientsText?: Record<string, string>;
    allergyAdviceText?: Record<string, string>;
    recommendedUseText?: Record<string, string>;
    storageAdviceText?: Record<string, string>;
    warningsText?: Record<string, string>;
    shortLabelDescription?: Record<string, string>;
    referenceIntakeFootnoteText?: Record<string, string>;
    
    // Internal
    notesInternal?: string;
    coaAssetId?: ID;
}

/**
 * Input type for creating a nutrition batch row
 */
export interface CreateNutritionBatchRowInput {
    name: Record<string, string>;
    group: NutrientGroup;
    unit: string;
    valuePerServing?: number;
    valuePer100g?: number;
    referenceIntakePercentPerServing?: number;
    displayOrder?: number;
}

/**
 * Input type for updating a nutrition batch row
 */
export interface UpdateNutritionBatchRowInput {
    name?: Record<string, string>;
    group?: NutrientGroup;
    unit?: string;
    valuePerServing?: number;
    valuePer100g?: number;
    referenceIntakePercentPerServing?: number;
    displayOrder?: number;
}

/**
 * Plugin configuration options
 */
export interface NutritionBatchPluginOptions {
    /**
     * Enable debug logging
     * @default false
     */
    enableLogging?: boolean;
    
    /**
     * Default language for fallback translations
     * @default LanguageCode.en
     */
    defaultLanguage?: string;
}

/**
 * Default plugin configuration
 */
export const defaultNutritionBatchPluginOptions: NutritionBatchPluginOptions = {
    enableLogging: false,
    defaultLanguage: 'en'
};
