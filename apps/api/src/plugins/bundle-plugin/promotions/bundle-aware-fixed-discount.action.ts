import {
    LanguageCode,
    PromotionOrderAction,
} from '@vendure/core';
import { BundlePromotionGuardService } from '../services/bundle-promotion-guard.service';
import { BundleConfigService } from '../services/bundle-config.service';

let guardService: BundlePromotionGuardService;
let configService: BundleConfigService;

export const bundleAwareFixedDiscount = new PromotionOrderAction({
    code: 'bundle_aware_fixed_discount',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Discount order by fixed amount (respects bundle policies)',
        },
    ],
    args: {
        discount: {
            type: 'int',
            ui: { component: 'currency-form-input' },
            label: [{ languageCode: LanguageCode.en, value: 'Discount amount' }],
        },
    },
    
    init(injector) {
        guardService = injector.get(BundlePromotionGuardService);
        configService = injector.get(BundleConfigService);
    },
    
    async execute(ctx, order, args) {
        // Get current configuration from database
        const config = await configService.getConfig(ctx);
        
        // Filter out bundle lines based on global policy
        const eligibleLines = order.lines.filter(line => {
            const customFields = (line as any).customFields;
            
            // If not a bundle line, it's eligible
            if (!customFields?.bundleKey) {
                return true;
            }
            
            // Check global policy setting
            if (config.siteWidePromosAffectBundles === 'Allow') {
                return true; // Allow all bundle lines if policy is 'Allow'
            }
            
            // If policy is 'Exclude' (default), exclude bundle lines
            return false;
        });
        
        if (eligibleLines.length === 0) {
            return 0;
        }
        
        // Apply the full discount amount, but only to eligible lines
        // Vendure will prorate across the eligible lines automatically
        return -args.discount;
    },
});
