import path from 'path';
import { AdminUiExtension } from '@vendure/ui-devkit/compiler';

/**
 * Nutrition Batch Plugin Admin UI Extension
 * 
 * Extends ProductVariant detail view with a "Batches & Nutrition" tab
 * for managing nutrition information, ingredients, and regulatory texts.
 * 
 * Features:
 * - Multiple batches per product variant
 * - Serving size definitions
 * - Nutrition table editor
 * - Localized regulatory texts
 * - Full internationalization support (English and French)
 */
export const nutritionBatchUiExtension: AdminUiExtension = {
  id: 'nutrition-batch-ui',
  extensionPath: path.join(__dirname),
  providers: ['providers.ts'],
  translations: {
    en: path.join(__dirname, 'translations/en.json'),
    fr: path.join(__dirname, 'translations/fr.json'),
  },
};
