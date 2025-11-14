import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Customer, VendureEntity } from '@vendure/core';
import { Column, Entity, OneToOne, JoinColumn } from 'typeorm';

/**
 * Customer Reward Points Entity
 * 
 * One-to-one relationship with Customer entity.
 * Tracks each customer's reward points balance and lifetime statistics.
 * 
 * Fields:
 * - customerId: Foreign key to Customer (one-to-one)
 * - balance: Current available points balance
 * - lifetimeEarned: Total points ever earned (for reporting)
 * - lifetimeRedeemed: Total points ever redeemed (for reporting)
 */
@Entity()
export class CustomerRewardPoints extends VendureEntity {
    constructor(input?: DeepPartial<CustomerRewardPoints>) {
        super(input);
    }

    @Column()
    customerId: ID;

    @OneToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;

    @Column('int', { default: 0 })
    balance: number; // Current available points balance

    @Column('int', { default: 0 })
    lifetimeEarned: number; // Total points ever earned

    @Column('int', { default: 0 })
    lifetimeRedeemed: number; // Total points ever redeemed
}

