import {
    LanguageCode,
    OrderLine,
    PromotionOrderAction,
} from '@vendure/core';
import { BundlePromotionGuardService } from '../services/bundle-promotion-guard.service';

let guardService: BundlePromotionGuardService;

export const bundleAwarePercentageDiscount = new PromotionOrderAction({
    code: 'bundle_aware_percentage_discount',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Discount order by percentage (respects bundle policies)',
        },
    ],
    args: {
        discount: {
            type: 'int',
            ui: { component: 'number-form-input', suffix: '%' },
            label: [{ languageCode: LanguageCode.en, value: 'Discount percentage' }],
        },
    },
    
    init(injector) {
        guardService = injector.get(BundlePromotionGuardService);
    },
    
    async execute(ctx, order, args) {
        // Filter out bundle lines that shouldn't receive external promotions
        // Check each line's customFields for bundle metadata
        const eligibleLines = order.lines.filter(line => {
            const customFields = (line as any).customFields;
            
            // If not a bundle line, it's eligible
            if (!customFields?.bundleKey) {
                return true;
            }
            
            // For bundle lines, check if external promos are allowed
            // This would need to be stored or fetched from the bundle entity
            // For now, we'll be conservative and exclude bundle lines by default
            return false;
        });
        
        if (eligibleLines.length === 0) {
            return 0;
        }
        
        // Calculate discount only on eligible lines
        const totalEligible = eligibleLines.reduce(
            (total, line) => total + line.proratedLinePrice,
            0
        );
        
        const discountAmount = Math.round(totalEligible * (args.discount / 100));
        
        return -discountAmount;
    },
});
