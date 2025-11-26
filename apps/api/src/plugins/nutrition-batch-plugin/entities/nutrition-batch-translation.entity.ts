import { DeepPartial } from '@vendure/common/lib/shared-types';
import { LanguageCode, Translation, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { NutritionBatch } from './nutrition-batch.entity';

/**
 * Translation entity for NutritionBatch
 * Stores translatable text fields for different languages
 */
@Entity()
export class NutritionBatchTranslation extends VendureEntity implements Translation<NutritionBatch> {
    constructor(input?: DeepPartial<Translation<NutritionBatchTranslation>>) {
        super(input);
    }

    @Column('varchar')
    languageCode: LanguageCode;

    @Column('text', { default: '' })
    servingLabel: string;

    @Column('text', { default: '' })
    ingredientsText: string;

    @Column('text', { default: '' })
    allergyAdviceText: string;

    @Column('text', { default: '' })
    recommendedUseText: string;

    @Column('text', { default: '' })
    storageAdviceText: string;

    @Column('text', { default: '' })
    warningsText: string;

    @Column('text', { default: '' })
    shortLabelDescription: string;

    @Column('text', { default: '' })
    referenceIntakeFootnoteText: string;

    @Index()
    @ManyToOne(() => NutritionBatch, base => base.translations, { onDelete: 'CASCADE' })
    base: NutritionBatch;
}
