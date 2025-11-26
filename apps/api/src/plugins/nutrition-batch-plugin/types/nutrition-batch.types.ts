/**
 * Nutrition Batch Plugin - Type Definitions
 */

import { ID } from '@vendure/common/lib/shared-types';
import { LanguageCode } from '@vendure/core';

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
 * Translation input for nutrition batch
 */
export interface NutritionBatchTranslationInput {
    id?: ID;
    languageCode: LanguageCode;
    servingLabel: string;
    ingredientsText?: string;
    allergyAdviceText?: string;
    recommendedUseText?: string;
    storageAdviceText?: string;
    warningsText?: string;
    shortLabelDescription?: string;
    referenceIntakeFootnoteText?: string;
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
    servingsPerContainer?: number;
    
    // Translations
    translations: NutritionBatchTranslationInput[];
    
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
    servingsPerContainer?: number;
    
    // Translations
    translations?: NutritionBatchTranslationInput[];
    
    // Internal
    notesInternal?: string;
    coaAssetId?: ID;
}

/**
 * Translation input for nutrition batch row
 */
export interface NutritionBatchRowTranslationInput {
    id?: ID;
    languageCode: LanguageCode;
    name: string;
}

/**
 * Input type for creating a nutrition batch row
 */
export interface CreateNutritionBatchRowInput {
    translations: NutritionBatchRowTranslationInput[];
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
    translations?: NutritionBatchRowTranslationInput[];
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
