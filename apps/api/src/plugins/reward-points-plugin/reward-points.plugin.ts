import { PluginCommonModule, VendurePlugin, LanguageCode } from '@vendure/core';
import { gql } from 'graphql-tag';
import { RewardPointSettings } from './entities/reward-point-settings.entity';
import { CustomerRewardPoints } from './entities/customer-reward-points.entity';
import { RewardTransaction } from './entities/reward-transaction.entity';
import { RewardPointsSettingsService } from './services/reward-points-settings.service';
import { RewardPointsService } from './services/reward-points.service';
import { RewardPointsOrderService } from './services/reward-points-order.service';
import { RewardPointsPromotionSetupService } from './services/reward-points-promotion-setup.service';
import { RewardPointsEventHandlersService } from './services/reward-points-event-handlers.service';
import { RewardPointsTranslationService } from './services/reward-points-translation.service';
import { ShopApiRewardPointsResolver } from './api/reward-points-shop.resolver';
import {
    AdminRewardPointsSettingsResolver,
    AdminCustomerRewardPointsResolver,
    AdminRewardTransactionResolver,
} from './api/reward-points-admin-resolvers';
import { applyRewardPointsDiscount } from './promotions/reward-points-discount.action';

/**
 * Reward Points Plugin for Vendure
 * 
 * Implements a reward points system similar to SUMO Reward Points:
 * - Customers earn points based on order total
 * - Customers can redeem points during checkout
 * - Admin can view and manage all customers' reward points
 * - Automatic award of points after order payment is settled
 * - Full transaction history and audit trail
 * 
 * Features:
 * - Global settings (enabled/disabled, earn rate, redeem rate, min/max limits)
 * - Customer reward points balance tracking
 * - Transaction history with full audit trail
 * - GraphQL API extensions (Shop + Admin)
 * - Order pipeline integration
 * - Promotion system integration for point redemption discounts
 * - Admin UI extension page under "Marketing → Reward Points"
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    compatibility: '^3.5.0',
    
    // Register custom entities
    entities: [RewardPointSettings, CustomerRewardPoints, RewardTransaction],
    
    // Register services
    providers: [
        RewardPointsSettingsService,
        RewardPointsService,
        RewardPointsOrderService,
        RewardPointsPromotionSetupService,
        RewardPointsEventHandlersService,
        RewardPointsTranslationService,
    ],
    
    // Register GraphQL resolvers
    shopApiExtensions: {
        resolvers: [
            ShopApiRewardPointsResolver,
        ],
        schema: gql`
            type RewardPointSettings {
                id: ID!
                enabled: Boolean!
                earnRate: Float!
                redeemRate: Float!
                minRedeemAmount: Int!
                maxRedeemPerOrder: Int!
            }

            type CustomerRewardPoints {
                id: ID!
                customerId: ID!
                customer: Customer
                balance: Int!
                lifetimeEarned: Int!
                lifetimeRedeemed: Int!
                createdAt: DateTime!
                updatedAt: DateTime!
            }

            type RewardTransaction {
                id: ID!
                customerId: ID!
                customer: Customer
                orderId: ID
                order: Order
                type: String!
                points: Int!
                orderTotal: Int
                description: String!
                metadata: JSON
                createdAt: DateTime!
                updatedAt: DateTime!
            }

            type RewardTransactionList {
                items: [RewardTransaction!]!
                totalItems: Int!
            }

            input RewardTransactionListOptions {
                skip: Int
                take: Int
            }

            extend type Query {
                rewardPointSettings: RewardPointSettings
                customerRewardPoints: CustomerRewardPoints
                rewardTransactionHistory(options: RewardTransactionListOptions): RewardTransactionList!
            }

            extend type Mutation {
                redeemPoints(points: Int!): Order!
            }
        `,
    },

    adminApiExtensions: {
        resolvers: [
            AdminRewardPointsSettingsResolver,
            AdminCustomerRewardPointsResolver,
            AdminRewardTransactionResolver,
        ],
        schema: gql`
            type RewardPointSettings {
                id: ID!
                enabled: Boolean!
                earnRate: Float!
                redeemRate: Float!
                minRedeemAmount: Int!
                maxRedeemPerOrder: Int!
            }

            type CustomerRewardPoints {
                id: ID!
                customerId: ID!
                customer: Customer
                balance: Int!
                lifetimeEarned: Int!
                lifetimeRedeemed: Int!
                createdAt: DateTime!
                updatedAt: DateTime!
            }

            type RewardTransaction {
                id: ID!
                customerId: ID!
                customer: Customer
                orderId: ID
                order: Order
                type: String!
                points: Int!
                orderTotal: Int
                description: String!
                metadata: JSON
                createdAt: DateTime!
                updatedAt: DateTime!
            }

            type CustomerRewardPointsList {
                items: [CustomerRewardPoints!]!
                totalItems: Int!
            }

            type RewardTransactionList {
                items: [RewardTransaction!]!
                totalItems: Int!
            }

            input RewardTransactionListOptions {
                skip: Int
                take: Int
            }

            input UpdateRewardPointSettingsInput {
                enabled: Boolean
                earnRate: Float
                redeemRate: Float
                minRedeemAmount: Int
                maxRedeemPerOrder: Int
            }

            input AdjustCustomerPointsInput {
                customerId: ID!
                points: Int!
                description: String!
            }

            input CustomerRewardPointsListOptions {
                skip: Int
                take: Int
                filter: CustomerRewardPointsFilterParameter
            }

            input CustomerRewardPointsFilterParameter {
                customerId: IDOperators
            }

            extend type Query {
                rewardPointSettings: RewardPointSettings!
                allCustomerRewardPoints(options: CustomerRewardPointsListOptions): CustomerRewardPointsList!
                customerRewardPoints(customerId: ID!): CustomerRewardPoints
                rewardTransactionHistory(customerId: ID, options: RewardTransactionListOptions): RewardTransactionList!
            }

            extend type Mutation {
                updateRewardPointSettings(input: UpdateRewardPointSettingsInput!): RewardPointSettings!
                adjustCustomerPoints(input: AdjustCustomerPointsInput!): CustomerRewardPoints!
            }
        `,
    },

    // Add custom fields to Order and OrderLine (will be added in Phase 4)
    configuration: config => {
        // Order custom fields for tracking points redeemed/earned
        config.customFields.Order = [
            ...(config.customFields.Order || []),
            {
                name: 'pointsRedeemed',
                type: 'int',
                defaultValue: 0,
                label: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Points Redeemed'
                    },
                    {
                        languageCode: LanguageCode.fr,
                        value: 'Points Rachetés'
                    }
                ],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Total reward points redeemed in this order'
                    },
                    {
                        languageCode: LanguageCode.fr,
                        value: 'Total des points de récompense rachetés dans cette commande'
                    }
                ]
            },
            {
                name: 'pointsEarned',
                type: 'int',
                defaultValue: 0,
                label: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Points Earned'
                    },
                    {
                        languageCode: LanguageCode.fr,
                        value: 'Points Gagnés'
                    }
                ],
                description: [
                    {
                        languageCode: LanguageCode.en,
                        value: 'Total reward points earned from this order'
                    },
                    {
                        languageCode: LanguageCode.fr,
                        value: 'Total des points de récompense gagnés de cette commande'
                    }
                ]
            },
        ];

        // OrderLine custom fields for storing points redemption discount
        config.customFields.OrderLine = [
            ...(config.customFields.OrderLine || []),
            {
                name: 'pointsRedeemValue',
                type: 'int',
                internal: true,
                nullable: true,
            },
        ];

        // Promotion action registration for reward points discount
        config.promotionOptions = config.promotionOptions || {};
        config.promotionOptions.promotionActions = [
            ...(config.promotionOptions.promotionActions || []),
            applyRewardPointsDiscount
        ];

        return config;
    },
})
export class RewardPointsPlugin {}

// Export entities for use in services
export * from './entities/reward-point-settings.entity';
export * from './entities/customer-reward-points.entity';
export * from './entities/reward-transaction.entity';

