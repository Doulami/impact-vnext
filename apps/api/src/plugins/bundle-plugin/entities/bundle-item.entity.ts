import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { HasCustomFields, ProductVariant, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Bundle } from './bundle.entity';

/**
 * BundleItem Entity
 * 
 * Represents a component item within a bundle:
 * - Links to ProductVariant (the actual SKU)
 * - Specifies quantity needed per bundle
 * - Supports display ordering
 * - Stores component pricing for transparency
 */
@Entity()
export class BundleItem extends VendureEntity implements HasCustomFields {
    constructor(input?: DeepPartial<BundleItem>) {
        super(input);
    }

    @Column()
    bundleId: ID;

    @ManyToOne(() => Bundle, bundle => bundle.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'bundleId' })
    bundle: Bundle;

    @Column()
    productVariantId: ID;

    @ManyToOne(() => ProductVariant, { eager: true })
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;

    @Column()
    quantity: number; // Quantity per bundle

    @Column('decimal', { precision: 10, scale: 2 })
    unitPrice: number; // Individual component price for transparency

    @Column({ nullable: true })
    displayOrder?: number; // For UI ordering in bundle display

    @Column('simple-json')
    customFields: any;
}