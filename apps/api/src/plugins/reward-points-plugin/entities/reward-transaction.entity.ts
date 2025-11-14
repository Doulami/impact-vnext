import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { Customer, Order, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';

/**
 * Reward Transaction Type Enum
 */
export enum RewardTransactionType {
    EARNED = 'EARNED',
    REDEEMED = 'REDEEMED',
    EXPIRED = 'EXPIRED',
    ADJUSTED = 'ADJUSTED'
}

/**
 * Reward Transaction Entity
 * 
 * Audit trail for all reward points transactions.
 * Tracks every change to customer points balance with full history.
 * 
 * Fields:
 * - customerId: Foreign key to Customer (many-to-one)
 * - orderId: Optional foreign key to Order (when transaction is order-related)
 * - type: Transaction type (EARNED, REDEEMED, EXPIRED, ADJUSTED)
 * - points: Points amount (positive for earned, negative for redeemed)
 * - orderTotal: Order total when points were earned (for reference)
 * - description: Human-readable description
 * - metadata: Optional JSON metadata for additional context
 */
@Entity()
@Index(['customerId', 'createdAt']) // Index for efficient customer history queries
@Index(['orderId']) // Index for order-related queries
export class RewardTransaction extends VendureEntity {
    constructor(input?: DeepPartial<RewardTransaction>) {
        super(input);
    }

    @Column()
    @Index()
    customerId: ID;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;

    @Column({ nullable: true })
    orderId?: ID;

    @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'orderId' })
    order?: Order;

    @Column({
        type: 'enum',
        enum: RewardTransactionType
    })
    type: RewardTransactionType;

    @Column('int')
    points: number; // Positive for earned, negative for redeemed

    @Column('int', { nullable: true })
    orderTotal?: number; // Order total in cents when points were earned

    @Column('text')
    description: string;

    @Column('simple-json', { nullable: true })
    metadata?: any; // Optional JSON metadata for additional context
}

