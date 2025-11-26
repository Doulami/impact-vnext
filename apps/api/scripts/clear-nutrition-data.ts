import { bootstrap } from '@vendure/core';
import { config } from '../src/vendure-config';

/**
 * Script to clear all nutrition batch data from the database
 * 
 * Run with: npx ts-node scripts/clear-nutrition-data.ts
 */
async function clearNutritionData() {
    console.log('Starting to clear all nutrition batch data...');

    const app = await bootstrap(config);
    const connection = app.get('Connection');

    try {
        // Delete in correct order to respect foreign key constraints
        
        console.log('Deleting nutrition batch row translations...');
        const rowTranslationsResult = await connection.query(`
            DELETE FROM nutrition_batch_row_translation
        `);
        console.log(`Deleted ${rowTranslationsResult[1]} row translations`);

        console.log('Deleting nutrition batch rows...');
        const rowsResult = await connection.query(`
            DELETE FROM nutrition_batch_row
        `);
        console.log(`Deleted ${rowsResult[1]} rows`);

        console.log('Deleting nutrition batch translations...');
        const batchTranslationsResult = await connection.query(`
            DELETE FROM nutrition_batch_translation
        `);
        console.log(`Deleted ${batchTranslationsResult[1]} batch translations`);

        console.log('Deleting nutrition batches...');
        const batchesResult = await connection.query(`
            DELETE FROM nutrition_batch
        `);
        console.log(`Deleted ${batchesResult[1]} batches`);

        console.log('All nutrition batch data cleared successfully!');

    } catch (error) {
        console.error('Failed to clear data:', error);
        throw error;
    } finally {
        await app.close();
    }
}

// Run the script
clearNutritionData()
    .then(() => {
        console.log('Done!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('Error:', err);
        process.exit(1);
    });
