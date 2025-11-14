import { Injectable } from '@nestjs/common';
import { RequestContext, LanguageCode } from '@vendure/core';

/**
 * Reward Points Translation Service
 * 
 * Provides localized strings for the reward points plugin based on Vendure's
 * selected language context. Supports English and French.
 */
@Injectable()
export class RewardPointsTranslationService {
    
    /**
     * All translatable strings organized by language
     */
    private readonly translations = {
        [LanguageCode.en]: {
            // Transaction descriptions
            earnedPoints: (points: number) => `Earned ${points} points`,
            earnedPointsFromOrder: (points: number, orderCode: string) => `Earned ${points} points from order ${orderCode}`,
            redeemedPoints: (points: number) => `Redeemed ${points} points`,
            redeemedPointsForOrder: (points: number, orderCode: string) => `Redeemed ${points} points for order ${orderCode}`,
            pointsEarnedFromOrder: (orderCode: string) => `Points earned from order ${orderCode}`,
            
            // Error messages
            featureDisabled: 'Reward points feature is disabled',
            insufficientBalance: (available: number, requested: number) => 
                `Insufficient points balance. Available: ${available}, Requested: ${requested}`,
            minRedeemAmount: (minimum: number, requested: number) => 
                `Minimum redeem amount is ${minimum} points. Requested: ${requested}`,
            maxRedeemPerOrder: (maximum: number, requested: number) => 
                `Maximum redeem per order is ${maximum} points. Requested: ${requested}`,
            pointsMustBePositive: 'Points must be greater than 0',
            adjustmentCannotBeZero: 'Points adjustment cannot be zero',
            
            // Custom field labels
            pointsRedeemed: 'Points Redeemed',
            pointsEarned: 'Points Earned',
            pointsRedeemedDescription: 'Total reward points redeemed in this order',
            pointsEarnedDescription: 'Total reward points earned from this order',
            
            // Admin UI labels (for future use)
            rewardPoints: 'Reward Points',
            settings: 'Settings',
            enabled: 'Enabled',
            earnRate: 'Earn Rate',
            redeemRate: 'Redeem Rate',
            minimumRedeemAmount: 'Minimum Redeem Amount',
            maximumRedeemPerOrder: 'Maximum Redeem Per Order',
            customerBalance: 'Customer Balance',
            transactionHistory: 'Transaction History',
            balance: 'Balance',
            lifetimeEarned: 'Lifetime Earned',
            lifetimeRedeemed: 'Lifetime Redeemed',
            
            // Transaction types
            transactionTypes: {
                EARNED: 'Earned',
                REDEEMED: 'Redeemed',
                EXPIRED: 'Expired',
                ADJUSTED: 'Adjusted'
            }
        },
        
        [LanguageCode.fr]: {
            // Transaction descriptions
            earnedPoints: (points: number) => `${points} points gagnés`,
            earnedPointsFromOrder: (points: number, orderCode: string) => `${points} points gagnés de la commande ${orderCode}`,
            redeemedPoints: (points: number) => `${points} points rachetés`,
            redeemedPointsForOrder: (points: number, orderCode: string) => `${points} points rachetés pour la commande ${orderCode}`,
            pointsEarnedFromOrder: (orderCode: string) => `Points gagnés de la commande ${orderCode}`,
            
            // Error messages
            featureDisabled: 'La fonctionnalité de points de récompense est désactivée',
            insufficientBalance: (available: number, requested: number) => 
                `Solde de points insuffisant. Disponible : ${available}, Demandé : ${requested}`,
            minRedeemAmount: (minimum: number, requested: number) => 
                `Le montant minimum de rachat est de ${minimum} points. Demandé : ${requested}`,
            maxRedeemPerOrder: (maximum: number, requested: number) => 
                `Le maximum de rachat par commande est de ${maximum} points. Demandé : ${requested}`,
            pointsMustBePositive: 'Les points doivent être supérieurs à 0',
            adjustmentCannotBeZero: 'L\'ajustement des points ne peut pas être zéro',
            
            // Custom field labels
            pointsRedeemed: 'Points Rachetés',
            pointsEarned: 'Points Gagnés',
            pointsRedeemedDescription: 'Total des points de récompense rachetés dans cette commande',
            pointsEarnedDescription: 'Total des points de récompense gagnés de cette commande',
            
            // Admin UI labels (for future use)
            rewardPoints: 'Points de Récompense',
            settings: 'Paramètres',
            enabled: 'Activé',
            earnRate: 'Taux de Gain',
            redeemRate: 'Taux de Rachat',
            minimumRedeemAmount: 'Montant Minimum de Rachat',
            maximumRedeemPerOrder: 'Maximum de Rachat par Commande',
            customerBalance: 'Solde Client',
            transactionHistory: 'Historique des Transactions',
            balance: 'Solde',
            lifetimeEarned: 'Total Gagné',
            lifetimeRedeemed: 'Total Racheté',
            
            // Transaction types
            transactionTypes: {
                EARNED: 'Gagné',
                REDEEMED: 'Racheté',
                EXPIRED: 'Expiré',
                ADJUSTED: 'Ajusté'
            }
        }
    };
    
    /**
     * Get the current language from RequestContext, defaulting to English
     */
    private getLanguageCode(ctx: RequestContext): LanguageCode {
        // Check if the context has a language code
        const languageCode = ctx.languageCode;
        
        // Support both English and French, default to English for unsupported languages
        if (languageCode === LanguageCode.fr) {
            return LanguageCode.fr;
        }
        
        return LanguageCode.en;
    }
    
    /**
     * Get translations for the current context language
     */
    private getTranslations(ctx: RequestContext) {
        const languageCode = this.getLanguageCode(ctx);
        return this.translations[languageCode as keyof typeof this.translations];
    }
    
    // Transaction description methods
    earnedPoints(ctx: RequestContext, points: number): string {
        return this.getTranslations(ctx).earnedPoints(points);
    }
    
    earnedPointsFromOrder(ctx: RequestContext, points: number, orderCode: string): string {
        return this.getTranslations(ctx).earnedPointsFromOrder(points, orderCode);
    }
    
    redeemedPoints(ctx: RequestContext, points: number): string {
        return this.getTranslations(ctx).redeemedPoints(points);
    }
    
    redeemedPointsForOrder(ctx: RequestContext, points: number, orderCode: string): string {
        return this.getTranslations(ctx).redeemedPointsForOrder(points, orderCode);
    }
    
    pointsEarnedFromOrder(ctx: RequestContext, orderCode: string): string {
        return this.getTranslations(ctx).pointsEarnedFromOrder(orderCode);
    }
    
    // Error message methods
    featureDisabled(ctx: RequestContext): string {
        return this.getTranslations(ctx).featureDisabled;
    }
    
    insufficientBalance(ctx: RequestContext, available: number, requested: number): string {
        return this.getTranslations(ctx).insufficientBalance(available, requested);
    }
    
    minRedeemAmount(ctx: RequestContext, minimum: number, requested: number): string {
        return this.getTranslations(ctx).minRedeemAmount(minimum, requested);
    }
    
    maxRedeemPerOrder(ctx: RequestContext, maximum: number, requested: number): string {
        return this.getTranslations(ctx).maxRedeemPerOrder(maximum, requested);
    }
    
    pointsMustBePositive(ctx: RequestContext): string {
        return this.getTranslations(ctx).pointsMustBePositive;
    }
    
    adjustmentCannotBeZero(ctx: RequestContext): string {
        return this.getTranslations(ctx).adjustmentCannotBeZero;
    }
    
    // Custom field label methods (used in plugin configuration)
    pointsRedeemedLabel(languageCode: LanguageCode): string {
        const translations = this.translations[languageCode as keyof typeof this.translations];
        return translations?.pointsRedeemed || this.translations[LanguageCode.en].pointsRedeemed;
    }
    
    pointsEarnedLabel(languageCode: LanguageCode): string {
        const translations = this.translations[languageCode as keyof typeof this.translations];
        return translations?.pointsEarned || this.translations[LanguageCode.en].pointsEarned;
    }
    
    pointsRedeemedDescription(languageCode: LanguageCode): string {
        const translations = this.translations[languageCode as keyof typeof this.translations];
        return translations?.pointsRedeemedDescription || this.translations[LanguageCode.en].pointsRedeemedDescription;
    }
    
    pointsEarnedDescription(languageCode: LanguageCode): string {
        const translations = this.translations[languageCode as keyof typeof this.translations];
        return translations?.pointsEarnedDescription || this.translations[LanguageCode.en].pointsEarnedDescription;
    }
    
    // Transaction type translation
    transactionType(ctx: RequestContext, type: string): string {
        const translations = this.getTranslations(ctx);
        return translations.transactionTypes[type as keyof typeof translations.transactionTypes] || type;
    }
    
    /**
     * Get all supported languages
     */
    getSupportedLanguages(): LanguageCode[] {
        return Object.keys(this.translations) as LanguageCode[];
    }
}