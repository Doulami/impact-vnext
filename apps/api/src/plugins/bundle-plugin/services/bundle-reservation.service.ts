import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, Logger, ID } from '@vendure/core';
import { Bundle } from '../entities/bundle.entity';

/**
 * Bundle Reservation Service - Phase 2 (Bundle v3)
 * 
 * Manages the bundleReservedOpen counter for capacity-based availability tracking.
 * 
 * Key Responsibilities:
 * - Increment Reserved when orders are paid (PaymentSettled)
 * - Decrement Reserved when orders are shipped/delivered/cancelled
 * - Sync Reserved counts from actual order data for consistency
 * - Update bundleVirtualStock calculations automatically
 * 
 * Workflow:
 * 1. Order transitions to "PaymentSettled" → incrementReserved()
 * 2. Order transitions to "Shipped" or "Delivered" → decrementReserved()
 * 3. Order transitions to "Cancelled" (from PaymentSettled) → decrementReserved()
 * 4. Periodic consistency check → syncReservedCounts()
 */
@Injectable()
export class BundleReservationService {
    private static readonly loggerCtx = 'BundleReservationService';

    constructor(
        private connection: TransactionalConnection
    ) {}

    /**
     * Increment Reserved counter when order is paid
     * Called when order transitions to PaymentSettled state
     */
    async incrementReserved(
        ctx: RequestContext,
        bundleId: ID,
        quantity: number
    ): Promise<void> {
        try {
            const bundle = await this.connection.getRepository(ctx, Bundle).findOne({
                where: { id: bundleId },
                relations: ['shellProduct']
            });

            if (!bundle) {
                Logger.warn(
                    `Bundle ${bundleId} not found for reservation increment`,
                    BundleReservationService.loggerCtx
                );
                return;
            }

            // Increment reserved count
            const newReserved = (bundle.bundleReservedOpen || 0) + quantity;

            await this.connection.getRepository(ctx, Bundle).update(
                { id: bundleId },
                { bundleReservedOpen: newReserved }
            );

            Logger.debug(
                `Incremented bundleReservedOpen for bundle ${bundleId}: ${bundle.bundleReservedOpen || 0} → ${newReserved} (+${quantity})`,
                BundleReservationService.loggerCtx
            );

            // Log warning if reserved exceeds cap
            if (bundle.bundleCap && newReserved > bundle.bundleCap) {
                Logger.warn(
                    `Bundle ${bundleId} (${bundle.shellProduct?.name || 'Unknown'}): Reserved (${newReserved}) exceeds Cap (${bundle.bundleCap})! Virtual stock is now 0.`,
                    BundleReservationService.loggerCtx
                );
            }

        } catch (error) {
            Logger.error(
                `Failed to increment reserved for bundle ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleReservationService.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Decrement Reserved counter when order is fulfilled or cancelled
     * Called when order transitions to Shipped, Delivered, or Cancelled
     */
    async decrementReserved(
        ctx: RequestContext,
        bundleId: ID,
        quantity: number
    ): Promise<void> {
        try {
            const bundle = await this.connection.getRepository(ctx, Bundle).findOne({
                where: { id: bundleId },
                relations: ['shellProduct']
            });

            if (!bundle) {
                Logger.warn(
                    `Bundle ${bundleId} not found for reservation decrement`,
                    BundleReservationService.loggerCtx
                );
                return;
            }

            // Decrement reserved count (don't go below 0)
            const newReserved = Math.max(0, (bundle.bundleReservedOpen || 0) - quantity);

            await this.connection.getRepository(ctx, Bundle).update(
                { id: bundleId },
                { bundleReservedOpen: newReserved }
            );

            Logger.debug(
                `Decremented bundleReservedOpen for bundle ${bundleId}: ${bundle.bundleReservedOpen || 0} → ${newReserved} (-${quantity})`,
                BundleReservationService.loggerCtx
            );

        } catch (error) {
            Logger.error(
                `Failed to decrement reserved for bundle ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleReservationService.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Sync Reserved count from actual order data
     * Used for consistency checks and corrections
     * 
     * Counts orders in "open" states:
     * - PaymentSettled (paid but not yet shipped)
     * - PartiallyShipped (some items shipped, bundle still open)
     * 
     * Excludes:
     * - Shipped/Delivered (fulfilled)
     * - Cancelled (no longer consuming capacity)
     * - AddingItems, ArrangingPayment, etc. (not yet paid)
     */
    async syncReservedCounts(
        ctx: RequestContext,
        bundleId: ID
    ): Promise<{ oldValue: number; newValue: number; corrected: boolean }> {
        try {
            const bundle = await this.connection.getRepository(ctx, Bundle).findOne({
                where: { id: bundleId },
                relations: ['shellProduct']
            });

            if (!bundle) {
                Logger.warn(
                    `Bundle ${bundleId} not found for reservation sync`,
                    BundleReservationService.loggerCtx
                );
                return { oldValue: 0, newValue: 0, corrected: false };
            }

            // Query orders with this bundle in "open" states
            // Note: This is a simplified version - actual implementation would query
            // OrderLine customFields for bundleId and count quantities in open orders
            
            const oldReserved = bundle.bundleReservedOpen || 0;
            
            // TODO: Implement actual order query when Order entity structure is confirmed
            // For now, keep existing value
            const calculatedReserved = oldReserved;
            
            const corrected = oldReserved !== calculatedReserved;

            if (corrected) {
                await this.connection.getRepository(ctx, Bundle).update(
                    { id: bundleId },
                    { bundleReservedOpen: calculatedReserved }
                );
            }

            return {
                oldValue: oldReserved,
                newValue: calculatedReserved,
                corrected
            };

        } catch (error) {
            Logger.error(
                `Failed to sync reserved count for bundle ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleReservationService.loggerCtx
            );
            throw error;
        }
    }

    /**
     * Get current reservation status for a bundle
     */
    async getReservationStatus(
        ctx: RequestContext,
        bundleId: ID
    ): Promise<{
        bundleCap: number | null;
        reserved: number;
        virtualStock: number | null;
        overbooked: boolean;
    } | null> {
        try {
            const bundle = await this.connection.getRepository(ctx, Bundle).findOne({
                where: { id: bundleId }
            });

            if (!bundle) {
                return null;
            }

            return {
                bundleCap: bundle.bundleCap ?? null,
                reserved: bundle.bundleReservedOpen || 0,
                virtualStock: bundle.bundleVirtualStock,
                overbooked: bundle.bundleCap !== null && bundle.bundleCap !== undefined 
                    ? (bundle.bundleReservedOpen || 0) > bundle.bundleCap
                    : false
            };

        } catch (error) {
            Logger.error(
                `Failed to get reservation status for bundle ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleReservationService.loggerCtx
            );
            return null;
        }
    }
}
