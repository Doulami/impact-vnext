import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { HasCustomFields, ProductVariant, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Bundle } from './bundle.entity';

/**
 * BundleItem Entity - Bundle Plugin v2
 * 
 * Represents a component item within a bundle:
 * - Links to ProductVariant with RESTRICT constraint to prevent deletion
 * - Specifies quantity needed per bundle  
 * - Supports weight-based proration for fixed-price bundles
 * - Stores pricing snapshots for audit trail
 * - Enforces display ordering
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

    // CRITICAL: ON DELETE RESTRICT to prevent deletion of variants used in ACTIVE bundles
    @ManyToOne(() => ProductVariant, { 
        eager: true,
        onDelete: 'RESTRICT' // This prevents deletion of variants used in bundles
    })
    @JoinColumn({ name: 'productVariantId' })
    productVariant: ProductVariant;

    @Column('int')
    quantity: number; // Quantity per bundle (must be positive integer)

    @Column('decimal', { precision: 12, scale: 4, nullable: true })
    weight?: number; // Optional weight for fixed-price proration

    @Column('int', { default: 0 })
    displayOrder: number; // For UI ordering in bundle display (0-based)

    @Column('int', { nullable: true })
    unitPriceSnapshot?: number; // Price snapshot in cents for audit trail
    
    // Backwards compatibility field (deprecated but kept for existing code)
    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    unitPrice: number; // Deprecated: Individual component price for transparency

    @Column('simple-json', { nullable: true })
    customFields: any;
}