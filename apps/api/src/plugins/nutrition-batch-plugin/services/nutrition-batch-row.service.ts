import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, ID, UserInputError, LanguageCode, TranslatableSaver, TranslatorService } from '@vendure/core';
import { NutritionBatchRow } from '../entities/nutrition-batch-row.entity';
import { NutritionBatchRowTranslation } from '../entities/nutrition-batch-row-translation.entity';
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
        private connection: TransactionalConnection,
        private translatableSaver: TranslatableSaver,
        private translatorService: TranslatorService
    ) {}

    /**
     * Find all rows for a specific batch
     */
    async findByBatchId(ctx: RequestContext, batchId: ID): Promise<NutritionBatchRow[]> {
        const rows = await this.connection.getRepository(ctx, NutritionBatchRow).find({
            where: { nutritionBatchId: batchId },
            relations: ['translations'],
            order: { displayOrder: 'ASC', createdAt: 'ASC' }
        });
        return Promise.all(rows.map(row => this.translatorService.translate(row, ctx)));
    }

    /**
     * Find a single row by ID
     */
    async findOne(ctx: RequestContext, id: ID): Promise<NutritionBatchRow | null> {
        const row = await this.connection.getRepository(ctx, NutritionBatchRow).findOne({
            where: { id },
            relations: ['translations']
        });
        return row ? this.translatorService.translate(row, ctx) : null;
    }

    /**
     * Create a new nutrition batch row
     */
    async createRow(ctx: RequestContext, batchId: ID, input: CreateNutritionBatchRowInput): Promise<NutritionBatchRow> {
        const row = await this.translatableSaver.create({
            ctx,
            entityType: NutritionBatchRow,
            translationType: NutritionBatchRowTranslation,
            input: {
                nutritionBatchId: batchId,
                ...input,
                displayOrder: input.displayOrder ?? 0
            } as any
        });

        return this.translatorService.translate(row, ctx);
    }

    /**
     * Update an existing nutrition batch row
     */
    async updateRow(ctx: RequestContext, id: ID, input: UpdateNutritionBatchRowInput): Promise<NutritionBatchRow> {
        const row = await this.connection.getRepository(ctx, NutritionBatchRow).findOne({
            where: { id },
            relations: ['translations']
        });
        if (!row) {
            throw new UserInputError(`Nutrition batch row with ID ${id} not found`);
        }

        const updatedRow = await this.translatableSaver.update({
            ctx,
            entityType: NutritionBatchRow,
            translationType: NutritionBatchRowTranslation,
            input: { id, ...input } as any
        });

        return this.translatorService.translate(updatedRow, ctx);
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
        const rows = await Promise.all(
            inputs.map(input => this.translatableSaver.create({
                ctx,
                entityType: NutritionBatchRow,
                translationType: NutritionBatchRowTranslation,
                input: {
                    nutritionBatchId: batchId,
                    ...input,
                    displayOrder: input.displayOrder ?? 0
                } as any
            }))
        );

        return Promise.all(rows.map(row => this.translatorService.translate(row, ctx)));
    }

    /**
     * Create default macro rows
     * Pre-populates common macronutrient rows (Energy, Fat, Carbs, Protein, Salt)
     * 
     * This is a helper for quickly setting up the basic nutrition table structure.
     * Only creates macros that don't already exist (matched by English name + unit).
     * Values are left empty for the admin to fill in.
     */
    async createDefaultMacros(ctx: RequestContext, batchId: ID): Promise<NutritionBatchRow[]> {
        // Get existing rows
        const existingRows = await this.findByBatchId(ctx, batchId);
        
        // Create set of existing (name, unit) pairs for quick lookup
        const existingKeys = new Set(
            existingRows.map(row => {
                const nameEn = row.name; // Already translated by findByBatchId
                return `${nameEn}|${row.unit}`;
            })
        );
        
        const defaultMacros: CreateNutritionBatchRowInput[] = [
            {
                translations: [
                    { languageCode: LanguageCode.en, name: 'Energy' },
                    { languageCode: LanguageCode.fr, name: 'Énergie' },
                    { languageCode: LanguageCode.ar, name: 'الطاقة' }
                ],
                group: NutrientGroup.MACRO,
                unit: 'kcal',
                displayOrder: 1
            },
            {
                translations: [
                    { languageCode: LanguageCode.en, name: 'Energy' },
                    { languageCode: LanguageCode.fr, name: 'Énergie' },
                    { languageCode: LanguageCode.ar, name: 'الطاقة' }
                ],
                group: NutrientGroup.MACRO,
                unit: 'kJ',
                displayOrder: 2
            },
            {
                translations: [
                    { languageCode: LanguageCode.en, name: 'Fat' },
                    { languageCode: LanguageCode.fr, name: 'Matières grasses' },
                    { languageCode: LanguageCode.ar, name: 'الدهون' }
                ],
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 3
            },
            {
                translations: [
                    { languageCode: LanguageCode.en, name: 'Carbohydrates' },
                    { languageCode: LanguageCode.fr, name: 'Glucides' },
                    { languageCode: LanguageCode.ar, name: 'الكربوهيدرات' }
                ],
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 4
            },
            {
                translations: [
                    { languageCode: LanguageCode.en, name: 'Protein' },
                    { languageCode: LanguageCode.fr, name: 'Protéines' },
                    { languageCode: LanguageCode.ar, name: 'البروتين' }
                ],
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 5
            },
            {
                translations: [
                    { languageCode: LanguageCode.en, name: 'Salt' },
                    { languageCode: LanguageCode.fr, name: 'Sel' },
                    { languageCode: LanguageCode.ar, name: 'الملح' }
                ],
                group: NutrientGroup.MACRO,
                unit: 'g',
                displayOrder: 6
            }
        ];

        // Filter out macros that already exist (using English name for comparison)
        const macrosToCreate = defaultMacros.filter(macro => {
            const nameEn = macro.translations.find(t => t.languageCode === LanguageCode.en)?.name || '';
            const key = `${nameEn}|${macro.unit}`;
            return !existingKeys.has(key);
        });

        if (macrosToCreate.length === 0) {
            return [];
        }

        return this.bulkCreateRows(ctx, batchId, macrosToCreate);
    }
}
