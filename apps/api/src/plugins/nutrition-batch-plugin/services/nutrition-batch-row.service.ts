import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, ID, UserInputError, LanguageCode } from '@vendure/core';
import { NutritionBatchRow } from '../entities/nutrition-batch-row.entity';
import { CreateNutritionBatchRowInput, UpdateNutritionBatchRowInput, NutrientGroup } from '../types/nutrition-batch.types';

/**
 * NutritionBatchRowService
 * 
 * Handles all CRUD operations for NutritionBatchRow entities.
 * 
 * Features:
 * - CRUD operations for nutrition table rows
 * - Create default macro rows helper
 * - Bulk operations
 */
@Injectable()
export class NutritionBatchRowService {
    constructor(
        private connection: TransactionalConnection
    ) {}

    /**
     * Find all rows for a specific batch
     */
    async findByBatchId(ctx: RequestContext, batchId: ID): Promise<NutritionBatchRow[]> {
        return this.connection.getRepository(ctx, NutritionBatchRow).find({
            where: { nutritionBatchId: batchId },
            order: { displayOrder: 'ASC', createdAt: 'ASC' }
        });
    }

    /**
     * Find a single row by ID
     */
    async findOne(ctx: RequestContext, id: ID): Promise<NutritionBatchRow | null> {
        const row = await this.connection.getRepository(ctx, NutritionBatchRow).findOne({
            where: { id }
        });
        return row || null;
    }

    /**
     * Create a new nutrition batch row
     */
    async createRow(ctx: RequestContext, batchId: ID, input: CreateNutritionBatchRowInput): Promise<NutritionBatchRow> {
        const row = new NutritionBatchRow({
            nutritionBatchId: batchId,
            name: input.name,
            group: input.group,
            unit: input.unit,
            valuePerServing: input.valuePerServing,
            valuePer100g: input.valuePer100g,
            referenceIntakePercentPerServing: input.referenceIntakePercentPerServing,
            displayOrder: input.displayOrder ?? 0
        });

        return this.connection.getRepository(ctx, NutritionBatchRow).save(row);
    }

    /**
     * Update an existing nutrition batch row
     */
    async updateRow(ctx: RequestContext, id: ID, input: UpdateNutritionBatchRowInput): Promise<NutritionBatchRow> {
        const row = await this.findOne(ctx, id);
        if (!row) {
            throw new UserInputError(`Nutrition batch row with ID ${id} not found`);
        }

        // Update fields
        if (input.name !== undefined) row.name = input.name;
        if (input.group !== undefined) row.group = input.group;
        if (input.unit !== undefined) row.unit = input.unit;
        if (input.valuePerServing !== undefined) row.valuePerServing = input.valuePerServing;
        if (input.valuePer100g !== undefined) row.valuePer100g = input.valuePer100g;
        if (input.referenceIntakePercentPerServing !== undefined) row.referenceIntakePercentPerServing = input.referenceIntakePercentPerServing;
        if (input.displayOrder !== undefined) row.displayOrder = input.displayOrder;

        return this.connection.getRepository(ctx, NutritionBatchRow).save(row);
    }

    /**
     * Delete a nutrition batch row
     */
    async deleteRow(ctx: RequestContext, id: ID): Promise<boolean> {
        const row = await this.findOne(ctx, id);
        if (!row) {
            throw new UserInputError(`Nutrition batch row with ID ${id} not found`);
        }

        await this.connection.getRepository(ctx, NutritionBatchRow).remove(row);
        return true;
    }

    /**
     * Bulk create rows
     * Useful for creating multiple rows at once
     */
    async bulkCreateRows(ctx: RequestContext, batchId: ID, inputs: CreateNutritionBatchRowInput[]): Promise<NutritionBatchRow[]> {
        const rows = inputs.map(input => new NutritionBatchRow({
            nutritionBatchId: batchId,
            name: input.name,
            group: input.group,
            unit: input.unit,
            valuePerServing: input.valuePerServing,
            valuePer100g: input.valuePer100g,
            referenceIntakePercentPerServing: input.referenceIntakePercentPerServing,
            displayOrder: input.displayOrder ?? 0
        }));

        return this.connection.getRepository(ctx, NutritionBatchRow).save(rows);
    }

    /**
     * Create default macro rows
     * Pre-populates common macronutrient rows (Energy, Fat, Carbs, Protein, Salt)
     * 
     * This is a helper for quickly setting up the basic nutrition table structure.
     * Values are left empty for the admin to fill in.
     */
    async createDefaultMacros(ctx: RequestContext, batchId: ID): Promise<NutritionBatchRow[]> {
        const defaultMacros: CreateNutritionBatchRowInput[] = [
            {
                name: { 
                    [LanguageCode.en]: 'Energy',
                    [LanguageCode.fr]: 'Énergie'
                },
                group: NutrientGroup.MACRO,
                unit: 'kcal',
                displayOrder: 1
            },
            {
                name: { 
                    [LanguageCode.en]: 'Energy',
                    [LanguageCode.fr]: 'Énergie'
                },
                group: NutrientGroup.MACRO,
                unit: 'kJ',
                displayOrder: 2
            },
            {
                name: { 
                    [LanguageCode.en]: 'Fat',
                    [LanguageCode.fr]: 'Matières grasses'
                },
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 3
            },
            {
                name: { 
                    [LanguageCode.en]: 'Carbohydrates',
                    [LanguageCode.fr]: 'Glucides'
                },
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 4
            },
            {
                name: { 
                    [LanguageCode.en]: 'Protein',
                    [LanguageCode.fr]: 'Protéines'
                },
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 5
            },
            {
                name: { 
                    [LanguageCode.en]: 'Salt',
                    [LanguageCode.fr]: 'Sel'
                },
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 6
            }
        ];

        return this.bulkCreateRows(ctx, batchId, defaultMacros);
    }
}
