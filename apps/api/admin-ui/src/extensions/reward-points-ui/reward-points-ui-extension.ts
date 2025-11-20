import { AdminUiExtension } from '@vendure/ui-devkit/compiler';
import path from 'path';

/**
 * Reward Points Admin UI Extension
 * 
 * Provides multilingual admin interface for:
 * - Reward points settings configuration
 * - Customer points management and adjustment
 * - Transaction history viewing
 * - Real-time rate calculations and examples
 * 
 * Features complete internationalization support with English and French translations.
 */
export const rewardPointsUiExtension: AdminUiExtension = {
    id: 'reward-points-ui',
    extensionPath: path.join(__dirname),
    ngModules: [
        {
            type: 'shared',
            ngModuleFileName: 'reward-points-nav.module.ts',
            ngModuleName: 'RewardPointsNavModule',
        },
        {
            type: 'lazy',
            route: 'reward-points',
            ngModuleFileName: 'reward-points.module.ts',
            ngModuleName: 'RewardPointsModule',
        },
    ],
    translations: {
        en: path.join(__dirname, 'translations/en.json'),
        fr: path.join(__dirname, 'translations/fr.json'),
    },
};
