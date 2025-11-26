import { bootstrap } from '@vendure/core';
import { config } from '../src/vendure-config';

/**
 * Script to migrate old LocaleString JSON data to translation tables
 * 
 * Run with: npx ts-node scripts/migrate-nutrition-translations.ts
 */
async function migrateTranslations() {
    console.log('Starting migration: Converting LocaleString JSON to Translation tables...');

    const app = await bootstrap(config);
    const connection = app.get('Connection');

    try {
        // ============================================================================
        // Step 1: Migrate NutritionBatch translations
        // ============================================================================
        
        const batches = await connection.query(`
            SELECT 
                id,
                "servingLabel",
                "ingredientsText",
                "allergyAdviceText",
                "recommendedUseText",
                "storageAdviceText",
                "warningsText",
                "shortLabelDescription",
                "referenceIntakeFootnoteText"
            FROM nutrition_batch
        `);

        console.log(`Found ${batches.length} nutrition batches to migrate`);

        for (const batch of batches) {
            const fields = [
                'servingLabel',
                'ingredientsText',
                'allergyAdviceText',
                'recommendedUseText',
                'storageAdviceText',
                'warningsText',
                'shortLabelDescription',
                'referenceIntakeFootnoteText'
            ];

            // Collect all unique language codes from all fields
            const languageCodes = new Set<string>();
            const parsedData: any = {};

            for (const field of fields) {
                const value = batch[field];
                if (value) {
                    try {
                        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
                        parsedData[field] = parsed;
                        Object.keys(parsed).forEach(lang => languageCodes.add(lang));
                    } catch (e) {
                        // If not valid JSON, treat as plain string for 'en'
                        parsedData[field] = { en: value };
                        languageCodes.add('en');
                    }
                } else {
                    parsedData[field] = {};
                }
            }

            // If no language codes found, create at least an 'en' translation
            if (languageCodes.size === 0) {
                languageCodes.add('en');
            }

            // Create translation records for each language
            for (const languageCode of languageCodes) {
                await connection.query(`
                    INSERT INTO nutrition_batch_translation (
                        "createdAt",
                        "updatedAt",
                        "languageCode",
                        "servingLabel",
                        "ingredientsText",
                        "allergyAdviceText",
                        "recommendedUseText",
                        "storageAdviceText",
                        "warningsText",
                        "shortLabelDescription",
                        "referenceIntakeFootnoteText",
                        "baseId"
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    ON CONFLICT DO NOTHING
                `, [
                    new Date(),
                    new Date(),
                    languageCode,
                    parsedData.servingLabel[languageCode] || '',
                    parsedData.ingredientsText[languageCode] || '',
                    parsedData.allergyAdviceText[languageCode] || '',
                    parsedData.recommendedUseText[languageCode] || '',
                    parsedData.storageAdviceText[languageCode] || '',
                    parsedData.warningsText[languageCode] || '',
                    parsedData.shortLabelDescription[languageCode] || '',
                    parsedData.referenceIntakeFootnoteText[languageCode] || '',
                    batch.id
                ]);
            }

            console.log(`Migrated batch ${batch.id} (${languageCodes.size} languages)`);
        }

        console.log('Nutrition batch translations migrated successfully');

        // ============================================================================
        // Step 2: Migrate NutritionBatchRow translations
        // ============================================================================
        
        const rows = await connection.query(`
            SELECT id, name
            FROM nutrition_batch_row
        `);

        console.log(`Found ${rows.length} nutrition batch rows to migrate`);

        for (const row of rows) {
            let parsedName: any = {};
            
            if (row.name) {
                try {
                    parsedName = typeof row.name === 'string' ? JSON.parse(row.name) : row.name;
                } catch (e) {
                    // If not valid JSON, treat as plain string for 'en'
                    parsedName = { en: row.name };
                }
            } else {
                parsedName = { en: '' };
            }

            // Create translation record for each language in the name field
            for (const [languageCode, name] of Object.entries(parsedName)) {
                await connection.query(`
                    INSERT INTO nutrition_batch_row_translation (
                        "createdAt",
                        "updatedAt",
                        "languageCode",
                        "name",
                        "baseId"
                    ) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT DO NOTHING
                `, [new Date(), new Date(), languageCode, name, row.id]);
            }

            console.log(`Migrated row ${row.id}`);
        }

        console.log('Nutrition batch row translations migrated successfully');
        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run the migration
migrateTranslations()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
