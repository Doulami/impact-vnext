import { Injectable, OnModuleInit } from '@nestjs/common';
import { PromotionService, RequestContext, TransactionalConnection, LanguageCode, ChannelService } from '@vendure/core';
import { Logger } from '@vendure/core';

/**
 * Reward Points Promotion Setup Service
 * 
 * Creates a system-level promotion that automatically applies reward points discounts
 * to all order lines that have points redemption metadata stored in their customFields.
 * 
 * This promotion is created once on plugin initialization and remains active.
 */
@Injectable()
export class RewardPointsPromotionSetupService implements OnModuleInit {
    private static readonly REWARD_POINTS_PROMOTION_CODE = 'SYSTEM_REWARD_POINTS_DISCOUNT';
    private static readonly loggerCtx = 'RewardPointsPromotionSetupService';

    constructor(
        private promotionService: PromotionService,
        private connection: TransactionalConnection,
        private channelService: ChannelService
    ) {}

    async onModuleInit() {
        // Only create promotions on the main server process, not worker processes
        if (process.env.VENDURE_WORKER !== 'true') {
            // Create the reward points promotion after a short delay to ensure system is ready
            setTimeout(() => {
                this.ensureRewardPointsPromotion().catch(err => {
                    Logger.error(
                        `Failed to create reward points promotion: ${err.message}`,
                        RewardPointsPromotionSetupService.loggerCtx
                    );
                });
            }, 5000);
        } else {
            Logger.debug('Skipping promotion setup on worker process', RewardPointsPromotionSetupService.loggerCtx);
        }
    }

    /**
     * Ensures the system reward points promotion exists
     */
    private async ensureRewardPointsPromotion() {
        const ctx = await this.createSuperAdminContext();

        try {
            // Check for ALL existing reward points promotions by name
            const promotions = await this.promotionService.findAll(ctx, {
                filter: { name: { eq: 'System Reward Points Discount' } }
            });
            
            // Check for existing valid promotions
            let validPromotion = null;
            let invalidPromotions = [];
            
            for (const existingPromotion of promotions.items) {
                const hasCorrectAction = existingPromotion.actions.some(
                    action => action.code === 'apply_reward_points_order_discount'
                );
                
                if (hasCorrectAction && !validPromotion) {
                    validPromotion = existingPromotion;
                    Logger.info(
                        `Found valid reward points promotion (ID: ${existingPromotion.id})`,
                        RewardPointsPromotionSetupService.loggerCtx
                    );
                } else {
                    invalidPromotions.push(existingPromotion);
                }
            }
            
            // Delete invalid promotions (wrong action or duplicates)
            for (const invalidPromotion of invalidPromotions) {
                Logger.info(
                    `Deleting invalid/duplicate promotion (ID: ${invalidPromotion.id})...`,
                    RewardPointsPromotionSetupService.loggerCtx
                );
                
                try {
                    await this.promotionService.softDeletePromotion(ctx, invalidPromotion.id);
                    Logger.info(`Deleted promotion (ID: ${invalidPromotion.id})`, RewardPointsPromotionSetupService.loggerCtx);
                } catch (error) {
                    Logger.warn(
                        `Failed to delete promotion (ID: ${invalidPromotion.id}): ${error instanceof Error ? error.message : String(error)}`,
                        RewardPointsPromotionSetupService.loggerCtx
                    );
                }
            }
            
            // If we have a valid promotion, we're done
            if (validPromotion) {
                Logger.info(
                    `Using existing valid reward points promotion (ID: ${validPromotion.id})`,
                    RewardPointsPromotionSetupService.loggerCtx
                );
                return;
            }

            // Create the promotion with a condition that always passes
            // Vendure requires at least one condition
            const promotionResult = await this.promotionService.createPromotion(ctx, {
                enabled: true,
                // No coupon required - automatic promotion
                conditions: [
                    {
                        // Use minimum order value of 0 - always passes  
                        code: 'minimum_order_amount',
                        arguments: [
                            { name: 'amount', value: '0' },
                            { name: 'taxInclusion', value: 'exclude' }
                        ]
                    }
                ],
                actions: [
                    {
                        code: 'apply_reward_points_order_discount',
                        arguments: []
                    }
                ],
                translations: [
                    {
                        languageCode: LanguageCode.en,
                        name: 'System Reward Points Discount',
                        description: 'Automatically applies pre-calculated reward points discounts based on points redemption'
                    }
                ]
            });

            // Check if creation was successful
            if ('id' in promotionResult) {
                Logger.info(
                    `Created system reward points discount promotion (ID: ${promotionResult.id}) with action: apply_reward_points_order_discount`,
                    RewardPointsPromotionSetupService.loggerCtx
                );
                
                // Log the promotion details
                Logger.info(
                    `Promotion details: enabled=true, conditions=[minimum_order_amount:0], actions=[apply_reward_points_order_discount]`,
                    RewardPointsPromotionSetupService.loggerCtx
                );
            } else {
                Logger.error(
                    `Failed to create reward points promotion: ${JSON.stringify(promotionResult)}`,
                    RewardPointsPromotionSetupService.loggerCtx
                );
            }
        } catch (error) {
            Logger.error(
                `Error creating reward points promotion: ${error instanceof Error ? error.message : String(error)}`,
                RewardPointsPromotionSetupService.loggerCtx
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