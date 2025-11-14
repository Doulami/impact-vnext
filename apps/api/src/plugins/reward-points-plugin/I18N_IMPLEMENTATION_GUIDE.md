# Reward Points Plugin - Internationalization Implementation

## Overview

The reward points plugin now fully supports **English and French** localization that automatically follows Vendure's selected language context. All user-facing text, error messages, transaction descriptions, and Admin UI labels are properly internationalized.

## Implementation Summary

### ✅ Completed Features

1. **Translation Service** (`RewardPointsTranslationService`)
   - Centralized service for all localized strings
   - Automatically detects language from `RequestContext.languageCode`
   - Falls back to English for unsupported languages
   - Supports both English (`LanguageCode.en`) and French (`LanguageCode.fr`)

2. **Custom Field Labels** (Plugin Configuration)
   - Order custom fields now have both English and French labels/descriptions
   - `pointsRedeemed`: "Points Redeemed" / "Points Rachetés"
   - `pointsEarned`: "Points Earned" / "Points Gagnés"

3. **Localized Error Messages** (Service Layer)
   - All validation errors are localized based on request context
   - Feature disabled, insufficient balance, min/max limits, etc.
   - Proper French translations with context-appropriate formatting

4. **Localized Transaction Descriptions** (Service Layer)
   - Transaction history descriptions are contextually localized
   - English: "Earned 100 points from order ORDER123"
   - French: "100 points gagnés de la commande ORDER123"

5. **Admin UI Translation Files** (Future-Ready)
   - Complete English translations: `ui/translations/en.json`
   - Complete French translations: `ui/translations/fr.json`
   - Following bundle plugin patterns for consistency

6. **Comprehensive Test Coverage**
   - Unit tests validating all translation functionality
   - Language switching verification
   - Fallback behavior testing

## How Language Selection Works

The plugin **automatically follows Vendure's language selection** through these mechanisms:

### 1. RequestContext Language Detection
```typescript
private getLanguageCode(ctx: RequestContext): LanguageCode {
    const languageCode = ctx.languageCode;
    
    // Support both English and French, default to English
    if (languageCode === LanguageCode.fr) {
        return LanguageCode.fr;
    }
    
    return LanguageCode.en;
}
```

### 2. Service Layer Integration
All services use the translation service with the current RequestContext:
```typescript
// Error message automatically localized
throw new Error(this.translationService.featureDisabled(ctx));

// Transaction description automatically localized  
description: this.translationService.earnedPointsFromOrder(ctx, points, orderCode)
```

### 3. Custom Field Labels
Plugin configuration includes both languages:
```typescript
label: [
    { languageCode: LanguageCode.en, value: 'Points Redeemed' },
    { languageCode: LanguageCode.fr, value: 'Points Rachetés' }
]
```

## Language-Specific Examples

### English Context (`ctx.languageCode = LanguageCode.en`)
- Error: "Reward points feature is disabled"
- Transaction: "Earned 100 points from order ORDER123"
- Field Label: "Points Redeemed"

### French Context (`ctx.languageCode = LanguageCode.fr`)
- Error: "La fonctionnalité de points de récompense est désactivée"
- Transaction: "100 points gagnés de la commande ORDER123"
- Field Label: "Points Rachetés"

## File Structure

```
reward-points-plugin/
├── services/
│   ├── reward-points-translation.service.ts    # Main translation service
│   ├── reward-points.service.ts                # Updated with localization
│   ├── reward-points-event-handlers.service.ts # Updated with localization
│   └── __tests__/
│       └── reward-points-translation.service.test.ts  # Comprehensive tests
├── ui/
│   └── translations/
│       ├── en.json                             # English Admin UI translations
│       └── fr.json                             # French Admin UI translations
└── reward-points.plugin.ts                     # Updated with French custom field labels
```

## Key Features

### 🌐 Automatic Language Detection
- Reads `RequestContext.languageCode` automatically
- No manual language selection required
- Seamlessly integrates with Vendure's language system

### 🔄 Dynamic Translation
- All strings change in real-time based on context
- Error messages adapt to user's language preference
- Transaction history displays in appropriate language

### 🛡️ Robust Fallback System
- Unsupported languages default to English
- No crashes or missing translations
- Graceful degradation for edge cases

### 📊 Admin UI Ready
- Translation files prepared for future Admin UI implementation
- Comprehensive coverage of all admin interface strings
- Consistent terminology across languages

## Testing

Run the translation tests:
```bash
# Test language switching functionality
npm test -- reward-points-translation.service.test.ts
```

The tests verify:
- ✅ English/French transaction descriptions
- ✅ English/French error messages  
- ✅ Custom field label translations
- ✅ Transaction type translations
- ✅ Language detection and fallback behavior

## Usage in Development

When developing with the plugin, language context is handled automatically:

```typescript
// In a resolver or service
async redeemPoints(ctx: RequestContext, points: number) {
    // This error message will be in French if ctx.languageCode is LanguageCode.fr
    if (points <= 0) {
        throw new Error(this.translationService.pointsMustBePositive(ctx));
    }
    
    // Transaction description will also be localized
    const description = this.translationService.redeemedPoints(ctx, points);
}
```

## Production Deployment

1. **No Configuration Required**: The plugin automatically detects Vendure's language settings
2. **Database Migration Safe**: Custom field changes include both languages
3. **Backward Compatible**: Existing English-only installations continue working
4. **Performance Optimized**: Translations are loaded once at startup

## Extending to Additional Languages

To add support for more languages (e.g., Spanish, German):

1. Add translations to `RewardPointsTranslationService.translations`
2. Update the `getLanguageCode()` method to support new language codes  
3. Add corresponding Admin UI translation files
4. Update custom field definitions in plugin configuration
5. Add test cases for new languages

## Summary

The reward points plugin now provides **complete internationalization support** that automatically follows Vendure's language selection. Users will see all text, error messages, and transaction descriptions in their preferred language (English or French) without any manual configuration required.