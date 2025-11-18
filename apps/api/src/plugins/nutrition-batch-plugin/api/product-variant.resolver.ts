import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, ProductVariant, RequestContext } from '@vendure/core';
import { NutritionBatchService } from '../services/nutrition-batch.service';
import { NutritionBatch } from '../entities/nutrition-batch.entity';
import { NutritionLocaleService } from '../services/nutrition-locale.service';

/**
 * ProductVariant Field Resolver for Shop API
 * 
 * Extends ProductVariant with nutrition batch fields:
 * - nutritionBatches: All batches for the variant
 * - currentNutritionBatch: The batch marked as current for website
 * 
 * These fields are automatically available when querying ProductVariant in Shop API.
 */
@Resolver('ProductVariant')
export class ProductVariantNutritionResolver {
    constructor(
        private nutritionBatchService: NutritionBatchService,
        private nutritionLocaleService: NutritionLocaleService
    ) {}

    /**
     * Resolve all nutrition batches for a product variant
     */
    @ResolveField()
    async nutritionBatches(
        @Ctx() ctx: RequestContext,
        @Parent() variant: ProductVariant
    ): Promise<any[]> {
        const batches = await this.nutritionBatchService.findByVariantId(ctx, variant.id);
        return batches.map(batch => this.nutritionLocaleService.translateBatch(batch, ctx));
    }

    /**
     * Resolve the current active nutrition batch for a product variant
     */
    @ResolveField()
    async currentNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Parent() variant: ProductVariant
    ): Promise<any | null> {
        const batch = await this.nutritionBatchService.getCurrentBatch(ctx, variant.id);
        if (!batch) return null;
        return this.nutritionLocaleService.translateBatch(batch, ctx);
    }
}
