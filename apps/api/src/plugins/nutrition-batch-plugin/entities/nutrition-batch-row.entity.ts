import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { NutritionBatch } from './nutrition-batch.entity';
import { NutrientGroup } from '../types/nutrition-batch.types';

/**
 * NutritionBatchRow Entity
 * 
 * Represents a single row in the nutrition table (one nutrient).
 * Each batch has multiple rows (Energy, Protein, Vitamin C, etc.)
 * 
 * Features:
 * - Localized nutrient name
 * - Grouping for UI organization (macro, vitamin, mineral, etc.)
 * - Values per serving and per 100g
 * - Reference Intake percentage (AR/RI)
 * - Display ordering
 */
@Entity()
export class NutritionBatchRow extends VendureEntity {
    constructor(input?: DeepPartial<NutritionBatchRow>) {
        super(input);
    }

    // ==================== Identity & Relations ====================

    @Index()
    @ManyToOne(() => NutritionBatch, batch => batch.rows, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'nutritionBatchId' })
    nutritionBatch: NutritionBatch;

    @Column()
    nutritionBatchId: ID;

    // ==================== Nutrient Information ====================

    /**
     * Name of the nutrient (localized JSON)
     * Example: { "en": "Vitamin C - L-Ascorbic Acid", "fr": "Vitamine C - Acide L-Ascorbique" }
     */
    @Column('simple-json')
    name: Record<string, string>;

    /**
     * Nutrient group for organization
     * Used for grouping rows in the UI
     */
    @Column({
        type: 'enum',
        enum: NutrientGroup
    })
    group: NutrientGroup;

    /**
     * Unit of measurement
     * Examples: "kcal", "kJ", "g", "mg", "µg", "IU"
     */
    @Column()
    unit: string;

    // ==================== Values ====================

    /**
     * Value per serving
     * Example: For 60g serving - 230 kcal
     */
    @Column('decimal', { precision: 12, scale: 3, nullable: true })
    valuePerServing?: number;

    /**
     * Value per 100g (optional, can be calculated or entered manually)
     * Example: 383 kcal per 100g
     */
    @Column('decimal', { precision: 12, scale: 3, nullable: true })
    valuePer100g?: number;

    /**
     * Reference Intake percentage per serving
     * Example: 400 for "Vitamin C - 400% AR*"
     */
    @Column('decimal', { precision: 8, scale: 2, nullable: true })
    referenceIntakePercentPerServing?: number;

    // ==================== Display ====================

    /**
     * Display order in the nutrition table
     * Lower values appear first
     */
    @Column('int', { default: 0 })
    displayOrder: number;
}
