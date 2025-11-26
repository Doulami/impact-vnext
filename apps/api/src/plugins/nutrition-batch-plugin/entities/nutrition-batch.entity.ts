import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { VendureEntity, ProductVariant, Asset, Translatable, Translation, LocaleString } from '@vendure/core';
import { Column, Entity, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { NutritionBatchRow } from './nutrition-batch-row.entity';
import { NutritionBatchTranslation } from './nutrition-batch-translation.entity';
import { ServingSizeUnit } from '../types/nutrition-batch.types';

/**
 * NutritionBatch Entity
 * 
 * Represents a single batch of nutrition information for a Product Variant.
 * Each variant can have multiple batches with one marked as current for the website.
 * 
 * Features:
 * - Batch identification (code, production/expiry dates)
 * - Serving information with units
 * - Localized regulatory texts (ingredients, allergens, usage, etc.)
 * - Nutrition table rows (one-to-many relation)
 * - Certificate of Analysis (COA) asset
 */
@Entity()
export class NutritionBatch extends VendureEntity implements Translatable {
    constructor(input?: DeepPartial<NutritionBatch>) {
        super(input);
    }

    @OneToMany(() => NutritionBatchTranslation, translation => translation.base, { eager: true })
    translations: Array<Translation<NutritionBatch>>;

    // ==================== Identity & Relations ====================

    @Index()
    @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;

    @Column()
    productVariantId: ID;

    @Column()
    batchCode: string;

    @Column({ type: 'timestamp', nullable: true })
    productionDate?: Date;

    @Column({ type: 'timestamp', nullable: true })
    expiryDate?: Date;

    /**
     * Only one batch per variant can be current for website
     * Enforced at service layer
     */
    @Column({ default: false })
    @Index()
    isCurrentForWebsite: boolean;

    // ==================== Serving Definition ====================

    @Column('decimal', { precision: 10, scale: 2 })
    servingSizeValue: number;

    @Column({
        type: 'enum',
        enum: ServingSizeUnit
    })
    servingSizeUnit: ServingSizeUnit;

    /**
     * Serving label shown to users
     * Translatable field - stored in translation entity
     */
    servingLabel: LocaleString;

    @Column('int', { nullable: true })
    servingsPerContainer?: number;

    // ==================== Regulatory Texts (Translatable) ====================

    /**
     * Full ingredients list
     * Translatable field - stored in translation entity
     */
    ingredientsText: LocaleString;

    /**
     * Allergy advice
     * Translatable field - stored in translation entity
     */
    allergyAdviceText: LocaleString;

    /**
     * Recommended use instructions
     * Translatable field - stored in translation entity
     */
    recommendedUseText: LocaleString;

    /**
     * Storage advice
     * Translatable field - stored in translation entity
     */
    storageAdviceText: LocaleString;

    /**
     * Warnings
     * Translatable field - stored in translation entity
     */
    warningsText: LocaleString;

    /**
     * Short label description
     * Translatable field - stored in translation entity
     */
    shortLabelDescription: LocaleString;

    /**
     * Reference intake footnote
     * Translatable field - stored in translation entity
     */
    referenceIntakeFootnoteText: LocaleString;

    // ==================== Internal / Admin ====================

    /**
     * Internal notes (not shown to customers)
     * For admin/team communication
     */
    @Column('text', { nullable: true })
    notesInternal?: string;

    /**
     * Optional link to Certificate of Analysis (COA) document
     */
    @ManyToOne(() => Asset, { nullable: true })
    coaAsset?: Asset;

    @Column({ nullable: true })
    coaAssetId?: ID;

    // ==================== Relations ====================

    /**
     * Nutrition table rows
     * One batch has many rows (nutrients)
     */
    @OneToMany(() => NutritionBatchRow, row => row.nutritionBatch, {
        cascade: true,
        eager: true
    })
    rows: NutritionBatchRow[];
}
