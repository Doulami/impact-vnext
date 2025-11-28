import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity, Product, Channel } from '@vendure/core';
import { Column, Entity, ManyToOne, Index } from 'typeorm';

/**
 * ProductAssociation Entity
 * 
 * Stores pre-calculated associations between products based on order history.
 * Each association represents a "frequently bought together" relationship
 * with multi-factor scoring (frequency + recency + value).
 * 
 * Indexes:
 * - (sourceProductId, channelId) for fast lookups when displaying recommendations
 * - (targetProductId, channelId) for reverse lookups
 */
@Entity()
@Index(['sourceProductId', 'channelId'])
@Index(['targetProductId', 'channelId'])
export class ProductAssociation extends VendureEntity {
    constructor(input?: DeepPartial<ProductAssociation>) {
        super(input);
    }

    // Source product (the product being viewed/in cart)
    @ManyToOne(() => Product, { eager: false })
    sourceProduct?: Product;

    @Column()
    sourceProductId: string;

    // Target product (the recommended product)
    @ManyToOne(() => Product, { eager: false })
    targetProduct?: Product;

    @Column()
    targetProductId: string;

    // Channel for multi-channel support
    @ManyToOne(() => Channel, { eager: false })
    channel?: Channel;

    @Column()
    channelId: string;

    // Co-occurrence count (raw frequency)
    @Column('int')
    cooccurrenceCount: number;

    // Frequency score (0-1, normalized frequency confidence)
    @Column('decimal', { precision: 5, scale: 4 })
    frequencyScore: number;

    // Recency score (0-1, time-weighted score)
    @Column('decimal', { precision: 5, scale: 4 })
    recencyScore: number;

    // Value score (0-1, normalized cart value contribution)
    @Column('decimal', { precision: 5, scale: 4 })
    valueScore: number;

    // Final score (weighted combination of above)
    @Column('decimal', { precision: 5, scale: 4 })
    finalScore: number;

    // Lift metric (confidence / support ratio)
    // Values > 1 indicate association is stronger than random chance
    @Column('decimal', { precision: 6, scale: 4, nullable: true })
    lift?: number;

    // Last time this association was calculated
    @Column('timestamp')
    lastCalculated: Date;

    /**
     * Validate that scores are in valid ranges
     */
    validate(): string[] {
        const errors: string[] = [];

        if (this.frequencyScore < 0 || this.frequencyScore > 1) {
            errors.push('Frequency score must be between 0 and 1');
        }

        if (this.recencyScore < 0 || this.recencyScore > 1) {
            errors.push('Recency score must be between 0 and 1');
        }

        if (this.valueScore < 0 || this.valueScore > 1) {
            errors.push('Value score must be between 0 and 1');
        }

        if (this.finalScore < 0 || this.finalScore > 1) {
            errors.push('Final score must be between 0 and 1');
        }

        if (this.cooccurrenceCount < 0) {
            errors.push('Cooccurrence count must be non-negative');
        }

        if (this.sourceProductId === this.targetProductId) {
            errors.push('Source and target products must be different');
        }

        return errors;
    }
}
