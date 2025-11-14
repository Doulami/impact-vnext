import { Injectable, OnModuleInit } from '@nestjs/common';
import { PromotionService, RequestContext, TransactionalConnection, LanguageCode, ChannelService } from '@vendure/core';
import { Logger } from '@vendure/core';

/**
 * Bundle Promotion Setup Service
 * 
 * Creates a system-level promotion that automatically applies bundle discounts
 * to all bundle component lines based on their stored customFields metadata.
 * 
 * This promotion is created once on plugin initialization and remains active.
 */
@Injectable()
export class BundlePromotionSetupService implements OnModuleInit {
    private static readonly BUNDLE_PROMOTION_CODE = 'SYSTEM_BUNDLE_DISCOUNT';
    private static readonly loggerCtx = 'BundlePromotionSetupService';

    constructor(
        private promotionService: PromotionService,
        private connection: TransactionalConnection,
        private channelService: ChannelService
    ) {}

    async onModuleInit() {
        // Create the bundle promotion after a short delay to ensure system is ready
        setTimeout(() => {
            this.ensureBundlePromotion().catch(err => {
                Logger.error(
                    `Failed to create bundle promotion: ${err.message}`,
                    BundlePromotionSetupService.loggerCtx
                );
            });
        }, 5000);
    }

    /**
     * Ensures the system bundle promotion exists
     */
    private async ensureBundlePromotion() {
        const ctx = await this.createSuperAdminContext();

        try {
            // Check if promotion already exists by name (not coupon code)
            const promotions = await this.promotionService.findAll(ctx, {
                filter: { name: { eq: 'System Bundle Discount' } }
            });
            const existingPromotion = promotions.items[0];

            if (existingPromotion) {
                Logger.info(
                    `Bundle discount promotion already exists (ID: ${existingPromotion.id})`,
                    BundlePromotionSetupService.loggerCtx
                );
                return;
            }

            // Create the promotion with a condition that always passes
            // Vendure requires at least one condition or action
            const promotionResult = await this.promotionService.createPromotion(ctx, {
                enabled: true,
                // No coupon required - automatic (omit instead of null)
                conditions: [
                    {
                        // Use minimum order value of 0 - always passes
                        code: 'minimum_order_amount',
                        arguments: [
                            { name: 'amount', value: '0' },
                            { name: 'taxInclusion', value: 'include' }
                        ]
                    }
                ],
                actions: [
                    {
                        code: 'apply_bundle_line_adjustments',
                        arguments: []
                    }
                ],
                translations: [
                    {
                        languageCode: LanguageCode.en,
                        name: 'System Bundle Discount',
                        description: 'Automatically applies pre-calculated bundle discounts to bundle components'
                    }
                ]
            });

            // Check if creation was successful
            if ('id' in promotionResult) {
                Logger.info(
                    `Created system bundle discount promotion (ID: ${promotionResult.id})`,
                    BundlePromotionSetupService.loggerCtx
                );
            } else {
                Logger.error(
                    `Failed to create promotion: ${JSON.stringify(promotionResult)}`,
                    BundlePromotionSetupService.loggerCtx
                );
            }
        } catch (error) {
            Logger.error(
                `Error creating bundle promotion: ${error instanceof Error ? error.message : String(error)}`,
                BundlePromotionSetupService.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Creates a super admin context for system operations
     */
    private async createSuperAdminContext(): Promise<RequestContext> {
        const channel = await this.channelService.getDefaultChannel();
        
        return RequestContext.deserialize({
            _channel: {
                id: channel.id,
                code: channel.code,
                token: channel.token,
                defaultLanguageCode: channel.defaultLanguageCode,
                availableLanguageCodes: channel.availableLanguageCodes,
                defaultCurrencyCode: channel.defaultCurrencyCode,
                availableCurrencyCodes: channel.availableCurrencyCodes,
                pricesIncludeTax: channel.pricesIncludeTax
            },
            _languageCode: LanguageCode.en,
            _isAuthorized: true,
            _authorizedAsOwnerOnly: false,
            _session: {
                id: 'system',
                token: 'system',
                expires: Date.now() + 1000 * 60 * 60,
                cacheExpiry: 1000 * 60 * 60,
                user: {
                    id: '1',
                    identifier: 'superadmin',
                    verified: true,
                    channelPermissions: []
                }
            },
            _apiType: 'admin'
        } as any); // Type assertion needed for RequestContext serialization
    }
}
