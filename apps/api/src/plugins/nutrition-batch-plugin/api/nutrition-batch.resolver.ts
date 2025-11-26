import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Allow, Ctx, ID, ListQueryBuilder, ListQueryOptions, Permission, PaginatedList, Relations, RelationPaths, RequestContext, Transaction } from '@vendure/core';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { NutritionBatchService } from '../services/nutrition-batch.service';
import { NutritionLocaleService } from '../services/nutrition-locale.service';
import { NutritionBatchRowService } from '../services/nutrition-batch-row.service';
import { NutritionBatch } from '../entities/nutrition-batch.entity';
import { NutritionBatchRow } from '../entities/nutrition-batch-row.entity';
import { CreateNutritionBatchInput, UpdateNutritionBatchInput, CreateNutritionBatchRowInput, UpdateNutritionBatchRowInput } from '../types/nutrition-batch.types';

/**
 * Admin API Resolver for Nutrition Batch management
 * 
 * Provides GraphQL operations for:
 * - Batch CRUD operations
 * - Row CRUD operations
 * - Current batch management
 * - Batch duplication
 */
@Resolver('NutritionBatch')
export class NutritionBatchAdminResolver {
    constructor(
        private nutritionBatchService: NutritionBatchService,
        private nutritionBatchRowService: NutritionBatchRowService,
        private listQueryBuilder: ListQueryBuilder
    ) {}

    // ==================== Batch Queries ====================

    @Query()
    @Allow(Permission.ReadCatalog)
    async nutritionBatches(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: ListQueryOptions<NutritionBatch>; variantId?: ID },
        @Relations(NutritionBatch) relations: RelationPaths<NutritionBatch>
    ): Promise<PaginatedList<NutritionBatch>> {
        const qb = this.listQueryBuilder.build(NutritionBatch, args.options, {
            relations: relations || ['productVariant', 'rows', 'coaAsset'],
            ctx,
        });

        // Filter by variantId if provided
        if (args.variantId) {
            qb.andWhere(`${qb.alias}.productVariantId = :variantId`, { variantId: args.variantId });
        }

        const [items, totalItems] = await qb.getManyAndCount();
        return { items, totalItems };
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async nutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID }
    ): Promise<NutritionBatch | null> {
        return this.nutritionBatchService.findOne(ctx, args.id);
    }

    @Query()
    @Allow(Permission.ReadCatalog)
    async currentNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { variantId: ID }
    ): Promise<NutritionBatch | null> {
        return this.nutritionBatchService.getCurrentBatch(ctx, args.variantId);
    }

    // ==================== Batch Mutations ====================

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async createNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateNutritionBatchInput }
    ): Promise<NutritionBatch> {
        return this.nutritionBatchService.create(ctx, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async updateNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID; input: UpdateNutritionBatchInput }
    ): Promise<NutritionBatch> {
        return this.nutritionBatchService.update(ctx, args.id, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.DeleteCatalog)
    async deleteNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID }
    ): Promise<DeletionResponse> {
        await this.nutritionBatchService.delete(ctx, args.id);
        return {
            result: DeletionResult.DELETED
        };
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async setCurrentNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { batchId: ID }
    ): Promise<NutritionBatch> {
        return this.nutritionBatchService.setCurrentBatch(ctx, args.batchId);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async duplicateNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID }
    ): Promise<NutritionBatch> {
        return this.nutritionBatchService.duplicateBatch(ctx, args.id);
    }

    // ==================== Row Queries ====================

    @Query()
    @Allow(Permission.ReadCatalog)
    async nutritionBatchRows(
        @Ctx() ctx: RequestContext,
        @Args() args: { batchId: ID }
    ): Promise<NutritionBatchRow[]> {
        return this.nutritionBatchRowService.findByBatchId(ctx, args.batchId);
    }

    // ==================== Row Mutations ====================

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async createNutritionBatchRow(
        @Ctx() ctx: RequestContext,
        @Args() args: { batchId: ID; input: CreateNutritionBatchRowInput }
    ): Promise<NutritionBatchRow> {
        return this.nutritionBatchRowService.createRow(ctx, args.batchId, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async updateNutritionBatchRow(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID; input: UpdateNutritionBatchRowInput }
    ): Promise<NutritionBatchRow> {
        return this.nutritionBatchRowService.updateRow(ctx, args.id, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.DeleteCatalog)
    async deleteNutritionBatchRow(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID }
    ): Promise<DeletionResponse> {
        await this.nutritionBatchRowService.deleteRow(ctx, args.id);
        return {
            result: DeletionResult.DELETED
        };
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.UpdateCatalog)
    async createDefaultMacroRows(
        @Ctx() ctx: RequestContext,
        @Args() args: { batchId: ID }
    ): Promise<NutritionBatchRow[]> {
        return this.nutritionBatchRowService.createDefaultMacros(ctx, args.batchId);
    }
}

/**
 * Shop API Resolver for Nutrition Batch (read-only)
 * 
 * Provides public access to nutrition data for storefront display.
 * All localized fields are automatically resolved based on request language.
 */
@Resolver('NutritionBatch')
export class NutritionBatchShopResolver {
    constructor(
        private nutritionBatchService: NutritionBatchService
    ) {}

    @Query()
    async currentNutritionBatch(
        @Ctx() ctx: RequestContext,
        @Args() args: { variantId: ID }
    ): Promise<NutritionBatch | null> {
        return this.nutritionBatchService.getCurrentBatch(ctx, args.variantId);
    }

    @Query()
    async nutritionBatches(
        @Ctx() ctx: RequestContext,
        @Args() args: { variantId: ID }
    ): Promise<NutritionBatch[]> {
        return this.nutritionBatchService.findByVariantId(ctx, args.variantId);
    }
}

/**
 * Shop API Resolver for Nutrition Batch Row
 * Resolves localized row name field
 */
@Resolver('NutritionBatchRow')
export class NutritionBatchRowShopResolver {
    // No custom resolvers needed - TranslatorService handles translation
}
