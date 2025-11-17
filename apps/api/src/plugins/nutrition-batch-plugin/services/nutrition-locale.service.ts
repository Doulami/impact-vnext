import { Injectable } from '@nestjs/common';
import { RequestContext, LanguageCode } from '@vendure/core';

/**
 * NutritionLocaleService
 * 
 * Handles locale-aware resolution of localized JSON fields.
 * Resolves the correct language string based on RequestContext languageCode.
 * 
 * Usage:
 * - Call resolveLocaleString() to get the appropriate language version
 * - Falls back to English if requested language not available
 */
@Injectable()
export class NutritionLocaleService {
    /**
     * Resolve a localized JSON object to a single string based on request language
     * 
     * @param ctx RequestContext with languageCode
     * @param localeObject JSON object with language keys (e.g. {"en": "...", "fr": "..."})
     * @param defaultLanguage Fallback language if requested language not found
     * @returns Resolved string in the appropriate language
     */
    resolveLocaleString(
        ctx: RequestContext,
        localeObject: Record<string, string> | undefined | null,
        defaultLanguage: LanguageCode = LanguageCode.en
    ): string | undefined {
        if (!localeObject) {
            return undefined;
        }

        // Get requested language from context
        const requestedLanguage = ctx.languageCode;

        // Try to get the requested language
        if (localeObject[requestedLanguage]) {
            return localeObject[requestedLanguage];
        }

        // Fallback to default language
        if (localeObject[defaultLanguage]) {
            return localeObject[defaultLanguage];
        }

        // Last resort: return first available language
        const availableLanguages = Object.keys(localeObject);
        if (availableLanguages.length > 0) {
            return localeObject[availableLanguages[0]];
        }

        return undefined;
    }

    /**
     * Resolve all localized fields in a nutrition batch
     * Transforms Record<string, string> fields to simple strings based on context language
     * 
     * This is useful for GraphQL field resolvers that need to return locale-aware data
     */
    resolveNutritionBatchLocales<T extends Record<string, any>>(
        ctx: RequestContext,
        batch: T | null | undefined
    ): T | null {
        if (!batch) return null;

        return {
            ...batch,
            servingLabel: this.resolveLocaleString(ctx, batch.servingLabel),
            ingredientsText: this.resolveLocaleString(ctx, batch.ingredientsText),
            allergyAdviceText: this.resolveLocaleString(ctx, batch.allergyAdviceText),
            recommendedUseText: this.resolveLocaleString(ctx, batch.recommendedUseText),
            storageAdviceText: this.resolveLocaleString(ctx, batch.storageAdviceText),
            warningsText: this.resolveLocaleString(ctx, batch.warningsText),
            shortLabelDescription: this.resolveLocaleString(ctx, batch.shortLabelDescription),
            referenceIntakeFootnoteText: this.resolveLocaleString(ctx, batch.referenceIntakeFootnoteText)
        };
    }

    /**
     * Resolve localized row names
     */
    resolveNutritionRowLocales<T extends Record<string, any>>(
        ctx: RequestContext,
        row: T | null | undefined
    ): T | null {
        if (!row) return null;

        return {
            ...row,
            name: this.resolveLocaleString(ctx, row.name)
        };
    }

    /**
     * Resolve a full batch with all its rows
     * Applies locale resolution to both batch and row fields
     */
    resolveBatchWithRows<T extends Record<string, any>>(
        ctx: RequestContext,
        batch: T | null | undefined
    ): T | null {
        if (!batch) return null;

        const resolvedBatch = this.resolveNutritionBatchLocales(ctx, batch);
        if (!resolvedBatch) return null;

        // Resolve row names if rows are present
        if ('rows' in resolvedBatch && Array.isArray((resolvedBatch as any).rows)) {
            (resolvedBatch as any).rows = (resolvedBatch as any).rows.map((row: Record<string, any>) => 
                this.resolveNutritionRowLocales(ctx, row)
            );
        }

        return resolvedBatch;
    }
}
