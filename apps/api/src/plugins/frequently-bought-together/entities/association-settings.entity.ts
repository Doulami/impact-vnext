import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

/**
 * AssociationSettings Entity
 * 
 * Singleton entity storing configuration for the Frequently Bought Together plugin.
 * Only one instance should exist in the database.
 * 
 * Default values ensure safe initial configuration.
 */
@Entity()
export class AssociationSettings extends VendureEntity {
    constructor(input?: DeepPartial<AssociationSettings>) {
        super(input);
    }

    // Plugin enabled/disabled
    @Column({ default: false })
    enabled: boolean;

    // Cron expression for scheduled job (default: daily at 2am)
    @Column({ default: '0 2 * * *' })
    jobSchedule: string;

    // Time window for order analysis (in days)
    @Column('int', { default: 90 })
    analysisTimeWindowDays: number;

    // Minimum number of co-occurrences to create an association
    @Column('int', { default: 5 })
    minCooccurrenceThreshold: number;

    // Minimum final score to keep an association
    @Column('decimal', { precision: 3, scale: 2, default: 0.3 })
    minScoreThreshold: number;

    // Maximum recommendations to show per product
    @Column('int', { default: 4 })
    maxRecommendationsPerProduct: number;

    // Scoring weights (must sum to 1.0)
    @Column('decimal', { precision: 3, scale: 2, default: 0.5 })
    frequencyWeight: number;

    @Column('decimal', { precision: 3, scale: 2, default: 0.3 })
    recencyWeight: number;

    @Column('decimal', { precision: 3, scale: 2, default: 0.2 })
    valueWeight: number;

    // Display location toggles
    @Column({ default: true })
    pdpRelatedSection: boolean;

    @Column({ default: true })
    pdpUnderAddToCart: boolean;

    @Column({ default: true })
    cartPage: boolean;

    @Column({ default: false })
    checkoutPage: boolean;

    // Fallback to related products when insufficient associations
    @Column({ default: true })
    fallbackToRelatedProducts: boolean;

    // Last calculation timestamp
    @Column('timestamp', { nullable: true })
    lastCalculation?: Date;

    // Last calculation duration (milliseconds)
    @Column('int', { nullable: true })
    lastCalculationDurationMs?: number;

    // Last calculation stats
    @Column('int', { nullable: true })
    lastCalculationAssociationsCount?: number;

    /**
     * Validate settings
     */
    validate(): string[] {
        const errors: string[] = [];

        // Validate time window
        if (this.analysisTimeWindowDays < 1) {
            errors.push('Analysis time window must be at least 1 day');
        }
        if (this.analysisTimeWindowDays > 365) {
            errors.push('Analysis time window cannot exceed 365 days');
        }

        // Validate thresholds
        if (this.minCooccurrenceThreshold < 1) {
            errors.push('Minimum cooccurrence threshold must be at least 1');
        }

        if (this.minScoreThreshold < 0 || this.minScoreThreshold > 1) {
            errors.push('Minimum score threshold must be between 0 and 1');
        }

        if (this.maxRecommendationsPerProduct < 1) {
            errors.push('Maximum recommendations must be at least 1');
        }

        // Validate scoring weights
        if (this.frequencyWeight < 0 || this.frequencyWeight > 1) {
            errors.push('Frequency weight must be between 0 and 1');
        }

        if (this.recencyWeight < 0 || this.recencyWeight > 1) {
            errors.push('Recency weight must be between 0 and 1');
        }

        if (this.valueWeight < 0 || this.valueWeight > 1) {
            errors.push('Value weight must be between 0 and 1');
        }

        const weightSum = this.frequencyWeight + this.recencyWeight + this.valueWeight;
        if (Math.abs(weightSum - 1.0) > 0.01) {
            errors.push('Scoring weights must sum to 1.0');
        }

        // Validate cron expression (basic check)
        if (!this.jobSchedule || this.jobSchedule.trim() === '') {
            errors.push('Job schedule cannot be empty');
        }

        return errors;
    }

    /**
     * Get default settings
     */
    static getDefaults(): Partial<AssociationSettings> {
        return {
            enabled: false,
            jobSchedule: '0 2 * * *', // 2am daily
            analysisTimeWindowDays: 90,
            minCooccurrenceThreshold: 5,
            minScoreThreshold: 0.3,
            maxRecommendationsPerProduct: 4,
            frequencyWeight: 0.5,
            recencyWeight: 0.3,
            valueWeight: 0.2,
            pdpRelatedSection: true,
            pdpUnderAddToCart: true,
            cartPage: true,
            checkoutPage: false,
            fallbackToRelatedProducts: true
        };
    }
}
