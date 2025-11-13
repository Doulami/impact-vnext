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

            // Create the promotion - NO CONDITIONS (runs on all orders, action filters internally)
            const promotion = await this.promotionService.createPromotion(ctx, {
                enabled: true,
                couponCode: null, // No coupon required - automatic
                startsAt: null,
                endsAt: null,
                perCustomerUsageLimit: null,
                usageLimit: null,
                name: 'System Bundle Discount',
                description: 'Automatically applies pre-calculated bundle discounts to bundle components',
                conditions: [], // No conditions - action handles filtering
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

            Logger.info(
                `Created system bundle discount promotion (ID: ${promotion.id})`,
                BundlePromotionSetupService.loggerCtx
            );
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
            _channel: channel,
            _languageCode: LanguageCode.en,
            _isAuthorized: true,
            _authorizedAsOwnerOnly: false,
            _session: {
                id: 'system',
                token: 'system',
                expires: new Date(Date.now() + 1000 * 60 * 60),
                cacheExpiry: 1000 * 60 * 60,
                user: {
                    id: '1', // Superadmin user ID
                    identifier: 'superadmin',
                    verified: true,
                    channelPermissions: []
                }
            },
            _apiType: 'admin'
        });
    }
}
