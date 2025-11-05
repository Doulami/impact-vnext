import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { HasCustomFields, VendureEntity } from '@vendure/core';
import { Column, Entity, OneToMany } from 'typeorm';
import { BundleItem } from './bundle-item.entity';

/**
 * Bundle Entity
 * 
 * Represents a bundle as specified in Bundle Plugin documentation:
 * - Single visible line item with pricing
 * - Contains multiple component variants
 * - Supports assets, tags, and enabled/disabled states
 */
@Entity()
export class Bundle extends VendureEntity implements HasCustomFields {
    constructor(input?: DeepPartial<Bundle>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ nullable: true })
    slug?: string;

    @Column('text', { nullable: true })
    description?: string;

    @Column('simple-json')
    assets: string[]; // Image URLs

    @Column('decimal', { precision: 10, scale: 2 })
    price: number; // Net price as per documentation

    @Column({ default: true })
    enabled: boolean;

    @Column('simple-json', { nullable: true })
    tags?: string[]; // For categorization (performance, muscle-gain, etc.)

    @Column({ nullable: true })
    category?: string; // Bundle category

    @OneToMany(() => BundleItem, bundleItem => bundleItem.bundle, { 
        cascade: true,
        eager: true 
    })
    items: BundleItem[];

    @Column('simple-json')
    customFields: any;
}