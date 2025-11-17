import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Ctx, ProductVariant, RequestContext } from '@vendure/core';
import { NutritionBatchService } from '../services/nutrition-batch.service';
import { NutritionBatch } from '../entities/nutrition-batch.entity';

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
        private nutritionBatchService: NutritionBatchService
    ) {}

    /**
     * Resolve all nutrition batches for a product variant
     */
    @ResolveField()
    async nutritionBatches(
        @Ctx() ctx: RequestContext,
        @Parent() variant: ProductVariant
    ): Promise<NutritionBatch[]> {
        return this.nutritionBatchService.findByVariantId(ctx, variant.id);
    }

    /**
     * Resolve the current active nutrition batch for a product variant
     */
    @ResolveField()
    async currentNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Parent() variant: ProductVariant
    ): Promise<NutritionBatch | null> {
        return this.nutritionBatchService.getCurrentBatch(ctx, variant.id);
    }
}
