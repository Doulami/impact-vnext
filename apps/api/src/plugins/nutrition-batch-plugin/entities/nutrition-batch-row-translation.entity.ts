import { DeepPartial } from '@vendure/common/lib/shared-types';
import { LanguageCode, Translation, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { NutritionBatchRow } from './nutrition-batch-row.entity';

/**
 * Translation entity for NutritionBatchRow
 * Stores translatable name field for different languages
 */
@Entity()
export class NutritionBatchRowTranslation extends VendureEntity implements Translation<NutritionBatchRow> {
    constructor(input?: DeepPartial<Translation<NutritionBatchRowTranslation>>) {
        super(input);
    }

    @Column('varchar')
    languageCode: LanguageCode;

    @Column('varchar')
    name: string;

    @Index()
    @ManyToOne(() => NutritionBatchRow, base => base.translations, { onDelete: 'CASCADE' })
    base: NutritionBatchRow;
}
