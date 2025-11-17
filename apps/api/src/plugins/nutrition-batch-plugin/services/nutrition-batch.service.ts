import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { RequestContext, TransactionalConnection, ID, UserInputError } from '@vendure/core';
import { NutritionBatch } from '../entities/nutrition-batch.entity';
import { NutritionBatchRow } from '../entities/nutrition-batch-row.entity';
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
        private connection: TransactionalConnection
    ) {}

    /**
     * Find all batches for a specific product variant
     */
    async findByVariantId(ctx: RequestContext, variantId: ID): Promise<NutritionBatch[]> {
        return this.connection.getRepository(ctx, NutritionBatch).find({
            where: { productVariantId: variantId },
            relations: ['rows', 'productVariant', 'coaAsset'],
            order: { createdAt: 'DESC' }
        });
    }

    /**
     * Find a single batch by ID
     */
    async findOne(ctx: RequestContext, id: ID): Promise<NutritionBatch | null> {
        const batch = await this.connection.getRepository(ctx, NutritionBatch).findOne({
            where: { id },
            relations: ['rows', 'productVariant', 'coaAsset']
        });
        return batch || null;
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
            relations: ['rows', 'productVariant', 'coaAsset']
        });
        return batch || null;
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

        const batch = new NutritionBatch({
            productVariantId: input.productVariantId,
            batchCode: input.batchCode,
            productionDate: input.productionDate,
            expiryDate: input.expiryDate,
            isCurrentForWebsite: input.isCurrentForWebsite,
            servingSizeValue: input.servingSizeValue,
            servingSizeUnit: input.servingSizeUnit,
            servingLabel: input.servingLabel,
            servingsPerContainer: input.servingsPerContainer,
            ingredientsText: input.ingredientsText,
            allergyAdviceText: input.allergyAdviceText,
            recommendedUseText: input.recommendedUseText,
            storageAdviceText: input.storageAdviceText,
            warningsText: input.warningsText,
            shortLabelDescription: input.shortLabelDescription,
            referenceIntakeFootnoteText: input.referenceIntakeFootnoteText,
            notesInternal: input.notesInternal,
            coaAssetId: input.coaAssetId,
            rows: [] // Rows added separately
        });

        return this.connection.getRepository(ctx, NutritionBatch).save(batch);
    }

    /**
     * Update an existing nutrition batch
     */
    async update(ctx: RequestContext, id: ID, input: UpdateNutritionBatchInput): Promise<NutritionBatch> {
        const batch = await this.findOne(ctx, id);
        if (!batch) {
            throw new UserInputError(`Nutrition batch with ID ${id} not found`);
        }

        // If setting this as current, unset other current batches for this variant
        if (input.isCurrentForWebsite === true && !batch.isCurrentForWebsite) {
            await this.unsetCurrentBatch(ctx, batch.productVariantId);
        }

        // Update fields
        if (input.batchCode !== undefined) batch.batchCode = input.batchCode;
        if (input.productionDate !== undefined) batch.productionDate = input.productionDate;
        if (input.expiryDate !== undefined) batch.expiryDate = input.expiryDate;
        if (input.isCurrentForWebsite !== undefined) batch.isCurrentForWebsite = input.isCurrentForWebsite;
        if (input.servingSizeValue !== undefined) batch.servingSizeValue = input.servingSizeValue;
        if (input.servingSizeUnit !== undefined) batch.servingSizeUnit = input.servingSizeUnit;
        if (input.servingLabel !== undefined) batch.servingLabel = input.servingLabel;
        if (input.servingsPerContainer !== undefined) batch.servingsPerContainer = input.servingsPerContainer;
        if (input.ingredientsText !== undefined) batch.ingredientsText = input.ingredientsText;
        if (input.allergyAdviceText !== undefined) batch.allergyAdviceText = input.allergyAdviceText;
        if (input.recommendedUseText !== undefined) batch.recommendedUseText = input.recommendedUseText;
        if (input.storageAdviceText !== undefined) batch.storageAdviceText = input.storageAdviceText;
        if (input.warningsText !== undefined) batch.warningsText = input.warningsText;
        if (input.shortLabelDescription !== undefined) batch.shortLabelDescription = input.shortLabelDescription;
        if (input.referenceIntakeFootnoteText !== undefined) batch.referenceIntakeFootnoteText = input.referenceIntakeFootnoteText;
        if (input.notesInternal !== undefined) batch.notesInternal = input.notesInternal;
        if (input.coaAssetId !== undefined) batch.coaAssetId = input.coaAssetId;

        return this.connection.getRepository(ctx, NutritionBatch).save(batch);
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

        // Create new batch with same data but new batch code
        const newBatch = new NutritionBatch({
            productVariantId: sourceBatch.productVariantId,
            batchCode: `${sourceBatch.batchCode}-COPY`,
            productionDate: undefined, // Clear dates for new batch
            expiryDate: undefined,
            isCurrentForWebsite: false, // Don't make copy current
            servingSizeValue: sourceBatch.servingSizeValue,
            servingSizeUnit: sourceBatch.servingSizeUnit,
            servingLabel: sourceBatch.servingLabel,
            servingsPerContainer: sourceBatch.servingsPerContainer,
            ingredientsText: sourceBatch.ingredientsText,
            allergyAdviceText: sourceBatch.allergyAdviceText,
            recommendedUseText: sourceBatch.recommendedUseText,
            storageAdviceText: sourceBatch.storageAdviceText,
            warningsText: sourceBatch.warningsText,
            shortLabelDescription: sourceBatch.shortLabelDescription,
            referenceIntakeFootnoteText: sourceBatch.referenceIntakeFootnoteText,
            notesInternal: sourceBatch.notesInternal,
            coaAssetId: sourceBatch.coaAssetId
        });

        const savedBatch = await this.connection.getRepository(ctx, NutritionBatch).save(newBatch);

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
