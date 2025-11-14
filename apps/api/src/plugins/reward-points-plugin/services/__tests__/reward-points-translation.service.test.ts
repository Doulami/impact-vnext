import { RequestContext, LanguageCode } from '@vendure/core';
import { RewardPointsTranslationService } from '../reward-points-translation.service';

describe('RewardPointsTranslationService', () => {
    let service: RewardPointsTranslationService;
    let mockEnglishContext: RequestContext;
    let mockFrenchContext: RequestContext;

    beforeEach(() => {
        service = new RewardPointsTranslationService();
        
        // Mock English context
        mockEnglishContext = {
            languageCode: LanguageCode.en,
        } as RequestContext;
        
        // Mock French context
        mockFrenchContext = {
            languageCode: LanguageCode.fr,
        } as RequestContext;
    });

    describe('Transaction descriptions', () => {
        test('should return English transaction descriptions for English context', () => {
            expect(service.earnedPoints(mockEnglishContext, 100)).toBe('Earned 100 points');
            expect(service.redeemedPoints(mockEnglishContext, 50)).toBe('Redeemed 50 points');
            expect(service.earnedPointsFromOrder(mockEnglishContext, 100, 'ORDER123')).toBe('Earned 100 points from order ORDER123');
            expect(service.pointsEarnedFromOrder(mockEnglishContext, 'ORDER123')).toBe('Points earned from order ORDER123');
        });

        test('should return French transaction descriptions for French context', () => {
            expect(service.earnedPoints(mockFrenchContext, 100)).toBe('100 points gagnés');
            expect(service.redeemedPoints(mockFrenchContext, 50)).toBe('50 points rachetés');
            expect(service.earnedPointsFromOrder(mockFrenchContext, 100, 'ORDER123')).toBe('100 points gagnés de la commande ORDER123');
            expect(service.pointsEarnedFromOrder(mockFrenchContext, 'ORDER123')).toBe('Points gagnés de la commande ORDER123');
        });
    });

    describe('Error messages', () => {
        test('should return English error messages for English context', () => {
            expect(service.featureDisabled(mockEnglishContext)).toBe('Reward points feature is disabled');
            expect(service.pointsMustBePositive(mockEnglishContext)).toBe('Points must be greater than 0');
            expect(service.insufficientBalance(mockEnglishContext, 50, 100)).toBe('Insufficient points balance. Available: 50, Requested: 100');
            expect(service.minRedeemAmount(mockEnglishContext, 100, 50)).toBe('Minimum redeem amount is 100 points. Requested: 50');
            expect(service.maxRedeemPerOrder(mockEnglishContext, 1000, 1500)).toBe('Maximum redeem per order is 1000 points. Requested: 1500');
        });

        test('should return French error messages for French context', () => {
            expect(service.featureDisabled(mockFrenchContext)).toBe('La fonctionnalité de points de récompense est désactivée');
            expect(service.pointsMustBePositive(mockFrenchContext)).toBe('Les points doivent être supérieurs à 0');
            expect(service.insufficientBalance(mockFrenchContext, 50, 100)).toBe('Solde de points insuffisant. Disponible : 50, Demandé : 100');
            expect(service.minRedeemAmount(mockFrenchContext, 100, 50)).toBe('Le montant minimum de rachat est de 100 points. Demandé : 50');
            expect(service.maxRedeemPerOrder(mockFrenchContext, 1000, 1500)).toBe('Le maximum de rachat par commande est de 1000 points. Demandé : 1500');
        });
    });

    describe('Custom field labels', () => {
        test('should return English labels for English language code', () => {
            expect(service.pointsRedeemedLabel(LanguageCode.en)).toBe('Points Redeemed');
            expect(service.pointsEarnedLabel(LanguageCode.en)).toBe('Points Earned');
            expect(service.pointsRedeemedDescription(LanguageCode.en)).toBe('Total reward points redeemed in this order');
            expect(service.pointsEarnedDescription(LanguageCode.en)).toBe('Total reward points earned from this order');
        });

        test('should return French labels for French language code', () => {
            expect(service.pointsRedeemedLabel(LanguageCode.fr)).toBe('Points Rachetés');
            expect(service.pointsEarnedLabel(LanguageCode.fr)).toBe('Points Gagnés');
            expect(service.pointsRedeemedDescription(LanguageCode.fr)).toBe('Total des points de récompense rachetés dans cette commande');
            expect(service.pointsEarnedDescription(LanguageCode.fr)).toBe('Total des points de récompense gagnés de cette commande');
        });

        test('should fall back to English for unsupported language codes', () => {
            expect(service.pointsRedeemedLabel(LanguageCode.de)).toBe('Points Redeemed');
            expect(service.pointsEarnedLabel(LanguageCode.es)).toBe('Points Earned');
        });
    });

    describe('Transaction type translation', () => {
        test('should return English transaction types for English context', () => {
            expect(service.transactionType(mockEnglishContext, 'EARNED')).toBe('Earned');
            expect(service.transactionType(mockEnglishContext, 'REDEEMED')).toBe('Redeemed');
            expect(service.transactionType(mockEnglishContext, 'EXPIRED')).toBe('Expired');
            expect(service.transactionType(mockEnglishContext, 'ADJUSTED')).toBe('Adjusted');
        });

        test('should return French transaction types for French context', () => {
            expect(service.transactionType(mockFrenchContext, 'EARNED')).toBe('Gagné');
            expect(service.transactionType(mockFrenchContext, 'REDEEMED')).toBe('Racheté');
            expect(service.transactionType(mockFrenchContext, 'EXPIRED')).toBe('Expiré');
            expect(service.transactionType(mockFrenchContext, 'ADJUSTED')).toBe('Ajusté');
        });
    });

    describe('Language detection', () => {
        test('should default to English for unsupported languages', () => {
            const unsupportedContext = { languageCode: LanguageCode.de } as RequestContext;
            expect(service.earnedPoints(unsupportedContext, 100)).toBe('Earned 100 points');
            expect(service.featureDisabled(unsupportedContext)).toBe('Reward points feature is disabled');
        });

        test('should return supported languages', () => {
            const supportedLanguages = service.getSupportedLanguages();
            expect(supportedLanguages).toContain(LanguageCode.en);
            expect(supportedLanguages).toContain(LanguageCode.fr);
        });
    });
});