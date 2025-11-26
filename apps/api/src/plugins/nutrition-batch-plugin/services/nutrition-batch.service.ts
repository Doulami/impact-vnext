import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RequestContext, TransactionalConnection, ID, UserInputError, TranslatableSaver, TranslatorService } from '@vendure/core';
import { NutritionBatch } from '../entities/nutrition-batch.entity';
import { NutritionBatchRow } from '../entities/nutrition-batch-row.entity';
import { NutritionBatchTranslation } from '../entities/nutrition-batch-translation.entity';
import { CreateNutritionBatchInput, UpdateNutritionBatchInput } from '../types/nutrition-batch.types';

/**
 * NutritionBatchService
 * 
 * Handles all CRUD operations and business logic for NutritionBatch entities.
 * 
 * Features:
 * - CRUD operations for batches
 * - Current batch management (ensures only one per variant)
 * - Batch duplication
 * - Validation
 */
@Injectable()
export class NutritionBatchService {
    constructor(
        private connection: TransactionalConnection,
        private translatableSaver: TranslatableSaver,
        private translatorService: TranslatorService
    ) {}

    /**
     * Find all batches for a specific product variant
     */
    async findByVariantId(ctx: RequestContext, variantId: ID): Promise<NutritionBatch[]> {
        const batches = await this.connection.getRepository(ctx, NutritionBatch).find({
            where: { productVariantId: variantId },
            relations: ['rows', 'productVariant', 'coaAsset', 'translations'],
            order: { createdAt: 'DESC' }
        });
        return Promise.all(batches.map(batch => this.translatorService.translate(batch, ctx)));
    }

    /**
     * Find a single batch by ID
     */
    async findOne(ctx: RequestContext, id: ID): Promise<NutritionBatch | null> {
        const batch = await this.connection.getRepository(ctx, NutritionBatch).findOne({
            where: { id },
            relations: ['rows', 'productVariant', 'coaAsset', 'translations']
        });
        return batch ? this.translatorService.translate(batch, ctx) : null;
    }

    /**
     * Get the current active batch for a variant
     * (the one with isCurrentForWebsite = true)
     */
    async getCurrentBatch(ctx: RequestContext, variantId: ID): Promise<NutritionBatch | null> {
        const batch = await this.connection.getRepository(ctx, NutritionBatch).findOne({
            where: { 
                productVariantId: variantId,
                isCurrentForWebsite: true
            },
            relations: ['rows', 'productVariant', 'coaAsset', 'translations']
        });
        return batch ? this.translatorService.translate(batch, ctx) : null;
    }

    /**
     * Create a new nutrition batch
     */
    async create(ctx: RequestContext, input: CreateNutritionBatchInput): Promise<NutritionBatch> {
        // Validate input
        this.validateBatchInput(input);

        // If this batch should be current, unset other current batches for this variant
        if (input.isCurrentForWebsite) {
            await this.unsetCurrentBatch(ctx, input.productVariantId);
        }

        const batch = await this.translatableSaver.create({
            ctx,
            entityType: NutritionBatch,
            translationType: NutritionBatchTranslation,
            input: input as any
        });

        return this.translatorService.translate(batch, ctx);
    }

    /**
     * Update an existing nutrition batch
     */
    async update(ctx: RequestContext, id: ID, input: UpdateNutritionBatchInput): Promise<NutritionBatch> {
        const batch = await this.connection.getRepository(ctx, NutritionBatch).findOne({
            where: { id },
            relations: ['translations']
        });
        if (!batch) {
            throw new UserInputError(`Nutrition batch with ID ${id} not found`);
        }

        // If setting this as current, unset other current batches for this variant
        if (input.isCurrentForWebsite === true && !batch.isCurrentForWebsite) {
            await this.unsetCurrentBatch(ctx, batch.productVariantId);
        }

        const updatedBatch = await this.translatableSaver.update({
            ctx,
            entityType: NutritionBatch,
            translationType: NutritionBatchTranslation,
            input: { id, ...input } as any
        });

        return this.translatorService.translate(updatedBatch, ctx);
    }

    /**
     * Delete a nutrition batch
     */
    async delete(ctx: RequestContext, id: ID): Promise<boolean> {
        const batch = await this.findOne(ctx, id);
        if (!batch) {
            throw new UserInputError(`Nutrition batch with ID ${id} not found`);
        }

        await this.connection.getRepository(ctx, NutritionBatch).remove(batch);
        return true;
    }

    /**
     * Set a specific batch as the current one for its variant
     * Automatically unsets other batches for that variant
     */
    async setCurrentBatch(ctx: RequestContext, batchId: ID): Promise<NutritionBatch> {
        const batch = await this.findOne(ctx, batchId);
        if (!batch) {
            throw new UserInputError(`Nutrition batch with ID ${batchId} not found`);
        }

        // Unset all other current batches for this variant
        await this.unsetCurrentBatch(ctx, batch.productVariantId);

        // Set this batch as current
        batch.isCurrentForWebsite = true;
        return this.connection.getRepository(ctx, NutritionBatch).save(batch);
    }

    /**
     * Duplicate an existing batch (clone with all rows and texts)
     * Useful for creating new batches based on previous ones
     */
    async duplicateBatch(ctx: RequestContext, sourceBatchId: ID): Promise<NutritionBatch> {
        const sourceBatch = await this.findOne(ctx, sourceBatchId);
        if (!sourceBatch) {
            throw new UserInputError(`Nutrition batch with ID ${sourceBatchId} not found`);
        }

        // Create translation inputs from source batch
        const translations = sourceBatch.translations.map(t => ({
            languageCode: t.languageCode,
            servingLabel: t.servingLabel,
            ingredientsText: t.ingredientsText,
            allergyAdviceText: t.allergyAdviceText,
            recommendedUseText: t.recommendedUseText,
            storageAdviceText: t.storageAdviceText,
            warningsText: t.warningsText,
            shortLabelDescription: t.shortLabelDescription,
            referenceIntakeFootnoteText: t.referenceIntakeFootnoteText
        }));

        // Create new batch with same data but new batch code
        const savedBatch = await this.translatableSaver.create({
            ctx,
            entityType: NutritionBatch,
            translationType: NutritionBatchTranslation,
            input: {
                productVariantId: sourceBatch.productVariantId,
                batchCode: `${sourceBatch.batchCode}-COPY`,
                productionDate: undefined,
                expiryDate: undefined,
                isCurrentForWebsite: false,
                servingSizeValue: sourceBatch.servingSizeValue,
                servingSizeUnit: sourceBatch.servingSizeUnit,
                servingsPerContainer: sourceBatch.servingsPerContainer,
                notesInternal: sourceBatch.notesInternal,
                coaAssetId: sourceBatch.coaAssetId,
                translations
            } as any
        });

        // Clone all rows
        if (sourceBatch.rows && sourceBatch.rows.length > 0) {
            const rowRepo = this.connection.getRepository(ctx, NutritionBatchRow);
            const newRows = sourceBatch.rows.map(sourceRow => new NutritionBatchRow({
                nutritionBatchId: savedBatch.id,
                name: sourceRow.name,
                group: sourceRow.group,
                unit: sourceRow.unit,
                valuePerServing: sourceRow.valuePerServing,
                valuePer100g: sourceRow.valuePer100g,
                referenceIntakePercentPerServing: sourceRow.referenceIntakePercentPerServing,
                displayOrder: sourceRow.displayOrder
            }));
            await rowRepo.save(newRows);
        }

        // Return the new batch with rows
        return this.findOne(ctx, savedBatch.id) as Promise<NutritionBatch>;
    }

    /**
     * Unset isCurrentForWebsite for all batches of a variant
     * Used to ensure only one current batch per variant
     */
    private async unsetCurrentBatch(ctx: RequestContext, variantId: ID): Promise<void> {
        await this.connection.getRepository(ctx, NutritionBatch).update(
            { productVariantId: variantId },
            { isCurrentForWebsite: false }
        );
    }

    /**
     * Validate batch input data
     */
    private validateBatchInput(input: CreateNutritionBatchInput | UpdateNutritionBatchInput): void {
        if ('batchCode' in input && !input.batchCode) {
            throw new UserInputError('Batch code is required');
        }
        if ('servingSizeValue' in input && (input.servingSizeValue === undefined || input.servingSizeValue <= 0)) {
            throw new UserInputError('Serving size value must be greater than 0');
        }
        if ('servingSizeUnit' in input && !input.servingSizeUnit) {
            throw new UserInputError('Serving size unit is required');
        }
    }
}
