import { Injectable, OnModuleInit } from '@nestjs/common';
import { PromotionService, RequestContext, TransactionalConnection, LanguageCode } from '@vendure/core';
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
        private connection: TransactionalConnection
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
            // Check if promotion already exists
            const existingPromotion = await this.connection.getRepository(ctx, 'Promotion')
                .findOne({
                    where: { couponCode: BundlePromotionSetupService.BUNDLE_PROMOTION_CODE }
                });

            if (existingPromotion) {
                Logger.info(
                    `Bundle discount promotion already exists (ID: ${existingPromotion.id})`,
                    BundlePromotionSetupService.loggerCtx
                );
                return;
            }

            // Create the promotion
            const promotion = await this.promotionService.createPromotion(ctx, {
                enabled: true,
                couponCode: BundlePromotionSetupService.BUNDLE_PROMOTION_CODE,
                startsAt: null,
                endsAt: null,
                perCustomerUsageLimit: null,
                usageLimit: null,
                name: 'System Bundle Discount',
                description: 'Automatically applies pre-calculated bundle discounts to bundle components',
                conditions: [
                    {
                        code: 'has_bundle_lines',
                        arguments: []
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
        const channel = await this.connection.getRepository('Channel').findOne({
            where: { code: '__default_channel__' }
        });

        if (!channel) {
            throw new Error('Default channel not found');
        }

        return new RequestContext({
            channel,
            apiType: 'admin',
            isAuthorized: true,
            authorizedAsOwnerOnly: false,
            session: {
                id: 'system',
                token: 'system',
                expires: new Date(Date.now() + 1000 * 60 * 60),
                cacheExpiry: 1000 * 60 * 60,
                user: {
                    id: 'system',
                    identifier: 'system',
                    verified: true,
                    channelPermissions: []
                }
            }
        });
    }
}
