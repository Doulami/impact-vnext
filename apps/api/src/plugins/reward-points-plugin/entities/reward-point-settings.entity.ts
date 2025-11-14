import { DeepPartial } from '@vendure/common/lib/shared-types';
import { VendureEntity } from '@vendure/core';
import { Column, Entity } from 'typeorm';

/**
 * Reward Point Settings Entity
 * 
 * Singleton entity storing global reward points configuration.
 * Only one record should exist (ID=1) with singleton pattern enforced in service.
 * 
 * Settings:
 * - enabled: Toggle reward points feature on/off
 * - earnRate: Points earned per currency unit (e.g., 1 point per $1)
 * - redeemRate: Currency value per point (e.g., $0.01 per point)
 * - minRedeemAmount: Minimum points required to redeem
 * - maxRedeemPerOrder: Maximum points that can be redeemed per order
 */
@Entity()
export class RewardPointSettings extends VendureEntity {
    constructor(input?: DeepPartial<RewardPointSettings>) {
        super(input);
    }

    @Column({ default: false })
    enabled: boolean;

    @Column('decimal', { precision: 10, scale: 4, default: '1' })
    earnRate: number; // Points per currency unit (e.g., 1.0 = 1 point per $1)

    @Column('decimal', { precision: 10, scale: 4, default: '0.01' })
    redeemRate: number; // Currency per point in cents (e.g., 0.01 = $0.01 per point)

    @Column('int', { default: 100 })
    minRedeemAmount: number; // Minimum points required to redeem

    @Column('int', { default: 10000 })
    maxRedeemPerOrder: number; // Maximum points that can be redeemed per order
}

