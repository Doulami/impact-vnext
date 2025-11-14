import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    ListQueryBuilder,
    PaginatedList,
    ID,
    Logger,
} from '@vendure/core';
import { CustomerRewardPoints } from '../entities/customer-reward-points.entity';
import { RewardTransaction, RewardTransactionType } from '../entities/reward-transaction.entity';
import { RewardPointsSettingsService } from './reward-points-settings.service';
import { RewardPointsTranslationService } from './reward-points-translation.service';

/**
 * Reward Points Service
 * 
 * Core business logic for reward points:
 * - Get customer balance
 * - Award points (after order settlement)
 * - Redeem points (during checkout)
 * - Get transaction history
 * - Calculate points and values
 */
@Injectable()
export class RewardPointsService {
    private static readonly loggerCtx = 'RewardPointsService';

    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private settingsService: RewardPointsSettingsService,
        private translationService: RewardPointsTranslationService,
    ) {}

    /**
     * Get or create customer reward points record
     */
    async getOrCreateCustomerPoints(
        ctx: RequestContext,
        customerId: ID
    ): Promise<CustomerRewardPoints> {
        const repo = this.connection.getRepository(ctx, CustomerRewardPoints);
        
        let customerPoints = await repo.findOne({
            where: { customerId: String(customerId) },
        });
        
        if (!customerPoints) {
            // Create new record with zero balance
            customerPoints = new CustomerRewardPoints({
                customerId: String(customerId),
                balance: 0,
                lifetimeEarned: 0,
                lifetimeRedeemed: 0,
            });
            customerPoints = await repo.save(customerPoints);
            
            Logger.info(
                `Created reward points record for customer ${customerId}`,
                RewardPointsService.loggerCtx
            );
        }
        
        return customerPoints;
    }

    /**
     * Get customer balance
     */
    async getCustomerBalance(ctx: RequestContext, customerId: ID): Promise<CustomerRewardPoints> {
        return this.getOrCreateCustomerPoints(ctx, customerId);
    }

    /**
     * Award points to customer (after order settlement)
     */
    async awardPoints(
        ctx: RequestContext,
        customerId: ID,
        points: number,
        orderId?: ID,
        description?: string,
        orderTotal?: number
    ): Promise<CustomerRewardPoints> {
        if (points <= 0) {
            throw new Error(this.translationService.pointsMustBePositive(ctx));
        }

        // Check if feature is enabled
        const isEnabled = await this.settingsService.isEnabled(ctx);
        if (!isEnabled) {
        Logger.warn(
            `Attempted to award points while feature is disabled. Customer: ${customerId}, Points: ${points}`,
            RewardPointsService.loggerCtx
        );
            throw new Error(this.translationService.featureDisabled(ctx));
        }

        const repo = this.connection.getRepository(ctx, CustomerRewardPoints);
        const transactionRepo = this.connection.getRepository(ctx, RewardTransaction);
        
        // Get or create customer points
        const customerPoints = await this.getOrCreateCustomerPoints(ctx, customerId);
        
        // Update balance
        customerPoints.balance += points;
        customerPoints.lifetimeEarned += points;
        
        const updated = await repo.save(customerPoints);
        
        // Create transaction record
        const transaction = new RewardTransaction({
            customerId: String(customerId),
            orderId: orderId ? String(orderId) : undefined,
            type: RewardTransactionType.EARNED,
            points: points,
            orderTotal: orderTotal,
            description: description || (orderId ? 
                this.translationService.earnedPointsFromOrder(ctx, points, String(orderId)) :
                this.translationService.earnedPoints(ctx, points)
            ),
        });
        await transactionRepo.save(transaction);
        
        Logger.info(
            `Awarded ${points} points to customer ${customerId}. New balance: ${updated.balance}`,
            RewardPointsService.loggerCtx
        );
        
        return updated;
    }

    /**
     * Redeem points (during checkout)
     * Validates balance and settings before redeeming
     */
    async redeemPoints(
        ctx: RequestContext,
        customerId: ID,
        points: number,
        orderId?: ID,
        description?: string
    ): Promise<CustomerRewardPoints> {
        if (points <= 0) {
            throw new Error(this.translationService.pointsMustBePositive(ctx));
        }

        // Check if feature is enabled
        const isEnabled = await this.settingsService.isEnabled(ctx);
        if (!isEnabled) {
            throw new Error(this.translationService.featureDisabled(ctx));
        }

        // Get settings for validation
        const settings = await this.settingsService.getSettings(ctx);
        
        // Validate min/max limits
        if (points < settings.minRedeemAmount) {
            throw new Error(
                this.translationService.minRedeemAmount(ctx, settings.minRedeemAmount, points)
            );
        }
        
        if (points > settings.maxRedeemPerOrder) {
            throw new Error(
                this.translationService.maxRedeemPerOrder(ctx, settings.maxRedeemPerOrder, points)
            );
        }

        const repo = this.connection.getRepository(ctx, CustomerRewardPoints);
        const transactionRepo = this.connection.getRepository(ctx, RewardTransaction);
        
        // Get customer points
        const customerPoints = await this.getOrCreateCustomerPoints(ctx, customerId);
        
        // Validate sufficient balance
        if (customerPoints.balance < points) {
            throw new Error(
                this.translationService.insufficientBalance(ctx, customerPoints.balance, points)
            );
        }
        
        // Update balance
        customerPoints.balance -= points;
        customerPoints.lifetimeRedeemed += points;
        
        const updated = await repo.save(customerPoints);
        
        // Create transaction record (negative points for redeemed)
        const transaction = new RewardTransaction({
            customerId: String(customerId),
            orderId: orderId ? String(orderId) : undefined,
            type: RewardTransactionType.REDEEMED,
            points: -points, // Negative for redeemed
            description: description || (orderId ? 
                this.translationService.redeemedPointsForOrder(ctx, points, String(orderId)) :
                this.translationService.redeemedPoints(ctx, points)
            ),
        });
        await transactionRepo.save(transaction);
        
        Logger.info(
            `Redeemed ${points} points from customer ${customerId}. New balance: ${updated.balance}`,
            RewardPointsService.loggerCtx
        );
        
        return updated;
    }

    /**
     * Adjust customer points (admin operation)
     * Can add or subtract points (points can be negative)
     */
    async adjustCustomerPoints(
        ctx: RequestContext,
        customerId: ID,
        points: number,
        description: string
    ): Promise<CustomerRewardPoints> {
        if (points === 0) {
            throw new Error(this.translationService.adjustmentCannotBeZero(ctx));
        }

        const repo = this.connection.getRepository(ctx, CustomerRewardPoints);
        const transactionRepo = this.connection.getRepository(ctx, RewardTransaction);
        
        // Get or create customer points
        const customerPoints = await this.getOrCreateCustomerPoints(ctx, customerId);
        
        // Update balance
        customerPoints.balance += points;
        
        if (points > 0) {
            customerPoints.lifetimeEarned += points;
        } else {
            customerPoints.lifetimeRedeemed += Math.abs(points);
        }
        
        // Ensure balance doesn't go negative (unless explicitly allowed by admin)
        if (customerPoints.balance < 0) {
            Logger.warn(
                `Customer ${customerId} balance would go negative (${customerPoints.balance}). Setting to 0.`,
                RewardPointsService.loggerCtx
            );
            customerPoints.balance = 0;
        }
        
        const updated = await repo.save(customerPoints);
        
        // Create transaction record
        const transaction = new RewardTransaction({
            customerId: String(customerId),
            type: RewardTransactionType.ADJUSTED,
            points: points,
            description: description,
        });
        await transactionRepo.save(transaction);
        
        Logger.info(
            `Adjusted ${points > 0 ? '+' : ''}${points} points for customer ${customerId}. New balance: ${updated.balance}`,
            RewardPointsService.loggerCtx
        );
        
        return updated;
    }

    /**
     * Get transaction history for a customer
     */
    async getTransactionHistory(
        ctx: RequestContext,
        customerId: ID,
        options?: { skip?: number; take?: number }
    ): Promise<PaginatedList<RewardTransaction>> {
        const repo = this.connection.getRepository(ctx, RewardTransaction);
        
        const qb = repo
            .createQueryBuilder('transaction')
            .where('transaction.customerId = :customerId', { customerId: String(customerId) })
            .orderBy('transaction.createdAt', 'DESC');
        
        const skip = options?.skip || 0;
        const take = options?.take || 10;
        
        const [items, totalItems] = await qb
            .skip(skip)
            .take(take)
            .getManyAndCount();
        
        return {
            items,
            totalItems,
        };
    }

    /**
     * Calculate points to earn from order total
     */
    calculatePointsToEarn(orderTotal: number, earnRate: number): number {
        // orderTotal is in cents, earnRate is points per currency unit
        // Convert to dollars, multiply by earnRate, round to integer
        const points = Math.round((orderTotal / 100) * earnRate);
        return Math.max(0, points); // Ensure non-negative
    }

    /**
     * Calculate redeem value (discount amount) from points
     */
    calculateRedeemValue(points: number, redeemRate: number): number {
        // redeemRate is currency per point (e.g., 0.01 = $0.01 per point)
        // Return value in cents
        const value = Math.round(points * redeemRate * 100);
        return Math.max(0, value); // Ensure non-negative
    }
}

