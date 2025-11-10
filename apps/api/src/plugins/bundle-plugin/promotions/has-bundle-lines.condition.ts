import { LanguageCode, PromotionCondition } from '@vendure/core';
import { Order } from '@vendure/core';

/**
 * Has Bundle Lines Promotion Condition
 * 
 * Phase 3.1 Implementation - Bundle Plugin v2
 * 
 * This promotion condition activates when an order contains one or more bundle lines.
 * It's used to trigger bundle-specific promotions and can be combined with other
 * conditions for complex bundle promotion rules.
 * 
 * Key Features:
 * - BUNDLE DETECTION: Identifies orders with exploded bundles
 * - FLEXIBLE CONFIGURATION: Can check for specific bundle types, minimum quantities, etc.
 * - GUARD SYSTEM SUPPORT: Works with promotion guard system for bundle exclusions
 * - HEADER/CHILD DISTINCTION: Can filter by header lines vs component lines
 */

export const hasBundleLines = new PromotionCondition({
    code: 'has_bundle_lines',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Order contains bundle lines matching specified criteria'
        }
    ],
    
    args: {
        minBundleLines: {
            type: 'int',
            defaultValue: 1,
            label: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Minimum bundle lines required'
                }
            ],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Minimum number of bundle lines (components) required to activate this condition'
                }
            ]
        },
        bundleIds: {
            type: 'string',
            list: true,
            label: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Specific bundle IDs (optional)'
                }
            ],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'If specified, only orders containing these specific bundles will match'
                }
            ]
        },
        includeHeaderLines: {
            type: 'boolean',
            defaultValue: false,
            label: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Include header lines in count'
                }
            ],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Whether to count bundle header lines (cosmetic) in addition to component lines'
                }
            ]
        },
        matchMode: {
            type: 'string',
            defaultValue: 'any',
            options: [
                { value: 'any', label: [{ languageCode: LanguageCode.en, value: 'Any of the specified bundles' }] },
                { value: 'all', label: [{ languageCode: LanguageCode.en, value: 'All of the specified bundles' }] }
            ],
            label: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Match mode'
                }
            ],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'How to match when multiple bundle IDs are specified'
                }
            ]
        }
    },

    /**
     * Check if the order meets the bundle line criteria
     */
    check(ctx, order, args) {
        // Get all order lines that are part of bundles
        const bundleLines = order.lines.filter(line => {
            const customFields = (line as any).customFields;
            
            // Must have bundleKey to be considered a bundle line
            if (!customFields?.bundleKey) {
                return false;
            }
            
            // Filter header lines if not included
            if (!args.includeHeaderLines && customFields.isBundleHeader) {
                return false;
            }
            
            // If specific bundle IDs are specified, filter by them
            const bundleIds = args.bundleIds || [];
            if (bundleIds.length > 0) {
                const bundleId = customFields.bundleId;
                if (!bundleId || !bundleIds.includes(bundleId)) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Check minimum bundle lines requirement
        const minLines = parseInt(String(args.minBundleLines)) || 1;
        if (bundleLines.length < minLines) {
            return false;
        }
        
        // If specific bundle IDs are specified, check match mode
        const bundleIds = args.bundleIds || [];
        if (bundleIds.length > 0) {
            const presentBundleIds = new Set(
                bundleLines
                    .map(line => (line as any).customFields?.bundleId)
                    .filter(Boolean)
            );
            
            if (args.matchMode === 'all') {
                // All specified bundle IDs must be present
                return bundleIds.every((bundleId: string) => presentBundleIds.has(bundleId));
            } else {
                // At least one specified bundle ID must be present (already filtered above)
                return presentBundleIds.size > 0;
            }
        }
        
        return true;
    },

    /**
     * Priority for condition evaluation
     * Bundle conditions should be evaluated early to enable/disable bundle-specific promotions
     */
    priorityValue: 100
});

/**
 * Helper functions for working with bundle lines in promotion conditions
 */

/**
 * Get all bundle lines from an order
 */
export function getBundleLines(order: Order, includeHeaders = false): any[] {
    return order.lines.filter(line => {
        const customFields = (line as any).customFields;
        if (!customFields?.bundleKey) {
            return false;
        }
        if (!includeHeaders && customFields.isBundleHeader) {
            return false;
        }
        return true;
    });
}

/**
 * Get unique bundle IDs present in an order
 */
export function getBundleIds(order: Order): string[] {
    const bundleIds = new Set<string>();
    
    order.lines.forEach(line => {
        const bundleId = (line as any).customFields?.bundleId;
        if (bundleId) {
            bundleIds.add(bundleId);
        }
    });
    
    return Array.from(bundleIds);
}

/**
 * Get bundle groups (header + children) from an order
 */
export function getBundleGroups(order: Order): Array<{
    bundleKey: string;
    bundleId: string;
    bundleName: string;
    headerLine?: any;
    childLines: any[];
}> {
    const groups = new Map<string, {
        bundleKey: string;
        bundleId: string;
        bundleName: string;
        headerLine?: any;
        childLines: any[];
    }>();
    
    // Group lines by bundleKey
    order.lines.forEach(line => {
        const customFields = (line as any).customFields;
        const bundleKey = customFields?.bundleKey;
        
        if (!bundleKey) return;
        
        if (!groups.has(bundleKey)) {
            groups.set(bundleKey, {
                bundleKey,
                bundleId: customFields.bundleId || '',
                bundleName: customFields.bundleName || 'Unknown Bundle',
                childLines: []
            });
        }
        
        const group = groups.get(bundleKey)!;
        
        if (customFields.isBundleHeader) {
            group.headerLine = line;
        } else {
            group.childLines.push(line);
        }
    });
    
    return Array.from(groups.values());
}

/**
 * Check if order has any bundles with specific discount types
 */
export function hasDiscountType(order: Order, discountType: 'fixed' | 'percent'): boolean {
    return order.lines.some(line => {
        const customFields = (line as any).customFields;
        return customFields?.bundleKey && customFields?.discountType === discountType;
    });
}

/**
 * Get total bundle savings in the order
 */
export function getTotalBundleSavings(order: Order): number {
    return order.lines.reduce((total, line) => {
        const customFields = (line as any).customFields;
        if (customFields?.bundleKey && customFields?.bundleAdjAmount) {
            // bundleAdjAmount is negative (discount)
            return total + Math.abs(customFields.bundleAdjAmount);
        }
        return total;
    }, 0);
}