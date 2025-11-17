import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { VendureEntity, ProductVariant, Asset } from '@vendure/core';
import { Column, Entity, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { NutritionBatchRow } from './nutrition-batch-row.entity';
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
export class NutritionBatch extends VendureEntity {
    constructor(input?: DeepPartial<NutritionBatch>) {
        super(input);
    }

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
     * Example JSON: {"en": "60 g (1.5 scoops)", "fr": "60 g (1,5 dosettes)"}
     */
    @Column('simple-json')
    servingLabel: Record<string, string>;

    @Column('int', { nullable: true })
    servingsPerContainer?: number;

    // ==================== Regulatory Texts (LocaleString) ====================

    /**
     * Full ingredients list (localized JSON)
     * Example: {"en": "Whey protein isolate...", "fr": "Isolat de protéines de lactosérum..."}
     */
    @Column('simple-json', { nullable: true })
    ingredientsText?: Record<string, string>;

    /**
     * Allergy advice (localized JSON)
     */
    @Column('simple-json', { nullable: true })
    allergyAdviceText?: Record<string, string>;

    /**
     * Recommended use instructions (localized JSON)
     */
    @Column('simple-json', { nullable: true })
    recommendedUseText?: Record<string, string>;

    /**
     * Storage advice (localized JSON)
     */
    @Column('simple-json', { nullable: true })
    storageAdviceText?: Record<string, string>;

    /**
     * Warnings (localized JSON)
     */
    @Column('simple-json', { nullable: true })
    warningsText?: Record<string, string>;

    /**
     * Short label description (localized JSON)
     */
    @Column('simple-json', { nullable: true })
    shortLabelDescription?: Record<string, string>;

    /**
     * Reference intake footnote (localized JSON)
     */
    @Column('simple-json', { nullable: true })
    referenceIntakeFootnoteText?: Record<string, string>;

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
