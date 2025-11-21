import { compileUiExtensions } from '@vendure/ui-devkit/compiler';
import path from 'path';
import { promises as fs } from 'fs';

// Import UI extensions
import { bundleUiExtension } from './src/plugins/bundle-plugin/ui/bundle-ui-extension';
import { rewardPointsUiExtension } from './src/plugins/reward-points-plugin/ui/reward-points-ui-extension';
import { nutritionBatchUiExtension } from './src/plugins/nutrition-batch-plugin/ui/nutrition-batch-ui-extension';

/**
 * Pre-compile Admin UI with all custom extensions for production deployment.
 * 
 * This script follows Vendure's recommended deployment pattern:
 * https://docs.vendure.io/guides/deployment/admin-ui-deployment/
 * 
 * Run this ONCE before building and deploying the API server.
 * The compiled Admin UI will be served as static files.
 */

console.log('Starting Admin UI compilation with custom extensions...');
console.log('Output directory: apps/api/admin-ui');

compileUiExtensions({
    outputPath: path.join(__dirname, 'admin-ui'),
    extensions: [
        bundleUiExtension,
        rewardPointsUiExtension,
        nutritionBatchUiExtension,
    ],
    devMode: false, // Production mode
})
    .compile?.()
    .then(async () => {
        console.log('✅ Admin UI compilation completed successfully!');
        
        // Handle Angular 19 output structure: files are in dist/browser/
        const browserPath = path.join(__dirname, 'admin-ui', 'dist', 'browser');
        const distPath = path.join(__dirname, 'admin-ui', 'dist');
        
        // Check if Angular 19 browser output exists
        try {
            await fs.access(browserPath);
            console.log('Detected Angular 19 output structure (dist/browser/)');
            console.log('Note: Update vendure-config.ts to point to admin-ui/dist/browser');
        } catch {
            console.log('Using standard output structure (dist/)');
        }
        
        // Verify critical files exist
        const configPath = path.join(__dirname, 'admin-ui', 'dist', 'browser', 'vendure-ui-config.json');
        const indexPath = path.join(__dirname, 'admin-ui', 'dist', 'browser', 'index.html');
        
        try {
            await fs.access(configPath);
            await fs.access(indexPath);
            console.log('✅ Verified: vendure-ui-config.json and index.html exist');
        } catch (error) {
            console.error('⚠️  Warning: Could not verify all output files');
        }
        
        console.log('\nNext steps:');
        console.log('1. Update vendure-config.ts AdminUiPlugin to use pre-compiled app');
        console.log('2. Run: npm run build');
        console.log('3. Run: npm run start');
        console.log('4. Access Admin UI at: http://localhost:3002/admin');
    })
    .catch((error) => {
        console.error('❌ Admin UI compilation failed:', error);
        process.exit(1);
    });
