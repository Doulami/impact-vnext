import { Injectable } from '@nestjs/common';
import { 
    Logger,
    RequestContext,
    TransactionalConnection,
    ID,
    EventBus
} from '@vendure/core';
import { Bundle, BundleStatus } from '../entities/bundle.entity';
import { BundleService } from './bundle.service';
import { BundleSafetyService } from './bundle-safety.service';

/**
 * Bundle Lifecycle Service
 * 
 * Phase 4.1 Implementation - Bundle Plugin v2
 * 
 * This service manages bundle status transitions and lifecycle operations:
 * - DRAFT → ACTIVE (publish bundle)
 * - ACTIVE → BROKEN (when components fail)
 * - ACTIVE → ARCHIVED (manual archive)
 * - BROKEN → ACTIVE (restore after fixing)
 * 
 * Key Features:
 * - Status transition validation
 * - Version management (increment on publish)
 * - Audit trail and reason tracking
 * - Integration with safety service for validation
 */
@Injectable()
export class BundleLifecycleService {
    private static readonly loggerCtx = 'BundleLifecycleService';
    
    constructor(
        private connection: TransactionalConnection,
        private bundleService: BundleService,
        private bundleSafetyService: BundleSafetyService,
        private eventBus: EventBus
    ) {}
    
    /**
     * Publish bundle: DRAFT → ACTIVE
     * Increments version and validates bundle integrity
     */
    async publishBundle(ctx: RequestContext, bundleId: ID): Promise<Bundle> {
        const bundle = await this.bundleService.findOne(ctx, bundleId);
        
        if (!bundle) {
            throw new Error(`Bundle ${bundleId} not found`);
        }
        
        if (bundle.status !== BundleStatus.DRAFT) {
            throw new Error(`Cannot publish bundle: current status is ${bundle.status}, must be DRAFT`);
        }
        
        // Validate bundle configuration
        const errors = bundle.validate();
        if (errors.length > 0) {
            throw new Error(`Cannot publish bundle due to validation errors: ${errors.join(', ')}`);
        }
        
        // Validate bundle integrity (all components available)
        const integrityCheck = await this.bundleSafetyService.validateBundleIntegrity(ctx, bundleId);
        if (!integrityCheck.isValid) {
            const issues = integrityCheck.issues.map(i => i.message).join(', ');
            throw new Error(`Cannot publish bundle due to integrity issues: ${issues}`);
        }
        
        Logger.info(`Publishing bundle ${bundleId} (${bundle.name})`, BundleLifecycleService.loggerCtx);
        
        // Update bundle to ACTIVE status and increment version
        bundle.status = BundleStatus.ACTIVE;
        bundle.version = bundle.version + 1;
        bundle.brokenReason = undefined;
        bundle.lastRecomputedAt = new Date();
        bundle.updatedAt = new Date();
        
        const updatedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        
        // Log publish event (simplified event handling)
        Logger.info(
            `Bundle published event: ${bundleId} v${updatedBundle.version}`,
            BundleLifecycleService.loggerCtx
        );
        
        Logger.info(
            `Bundle ${bundleId} published successfully (version ${updatedBundle.version})`,
            BundleLifecycleService.loggerCtx
        );
        
        return updatedBundle;
    }
    
    /**
     * Archive bundle: ACTIVE → ARCHIVED  
     * Used for manually retiring bundles
     */
    async archiveBundle(ctx: RequestContext, bundleId: ID, reason?: string): Promise<Bundle> {
        const bundle = await this.bundleService.findOne(ctx, bundleId);
        
        if (!bundle) {
            throw new Error(`Bundle ${bundleId} not found`);
        }
        
        if (bundle.status !== BundleStatus.ACTIVE) {
            throw new Error(`Cannot archive bundle: current status is ${bundle.status}, must be ACTIVE`);
        }
        
        Logger.info(`Archiving bundle ${bundleId} (${bundle.name})`, BundleLifecycleService.loggerCtx);
        
        bundle.status = BundleStatus.ARCHIVED;
        bundle.brokenReason = reason || 'Manually archived';
        bundle.updatedAt = new Date();
        
        const updatedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        
        // Log archive event (simplified event handling)
        Logger.info(
            `Bundle archived event: ${bundleId} - ${reason || 'Manual archive'}`,
            BundleLifecycleService.loggerCtx
        );
        
        Logger.info(`Bundle ${bundleId} archived successfully`, BundleLifecycleService.loggerCtx);
        
        return updatedBundle;
    }
    
    /**
     * Mark bundle as broken: ACTIVE → BROKEN
     * Used when components become unavailable or validation fails
     */
    async markBundleBroken(ctx: RequestContext, bundleId: ID, reason: string): Promise<Bundle> {
        const bundle = await this.bundleService.findOne(ctx, bundleId);
        
        if (!bundle) {
            throw new Error(`Bundle ${bundleId} not found`);
        }
        
        if (bundle.status !== BundleStatus.ACTIVE) {
            Logger.warn(
                `Attempted to mark bundle ${bundleId} as broken, but status is ${bundle.status}`,
                BundleLifecycleService.loggerCtx
            );
            return bundle; // Don't change status if not active
        }
        
        Logger.warn(`Marking bundle ${bundleId} (${bundle.name}) as BROKEN: ${reason}`, BundleLifecycleService.loggerCtx);
        
        bundle.status = BundleStatus.BROKEN;
        bundle.brokenReason = reason;
        bundle.updatedAt = new Date();
        
        const updatedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        
        // Log broken event (simplified event handling)
        Logger.warn(
            `Bundle broken event: ${bundleId} - ${reason}`,
            BundleLifecycleService.loggerCtx
        );
        
        return updatedBundle;
    }
    
    /**
     * Restore bundle: BROKEN → ACTIVE
     * Used after fixing issues that caused bundle to be broken
     */
    async restoreBundle(ctx: RequestContext, bundleId: ID): Promise<Bundle> {
        const bundle = await this.bundleService.findOne(ctx, bundleId);
        
        if (!bundle) {
            throw new Error(`Bundle ${bundleId} not found`);
        }
        
        if (bundle.status !== BundleStatus.BROKEN) {
            throw new Error(`Cannot restore bundle: current status is ${bundle.status}, must be BROKEN`);
        }
        
        // Validate bundle integrity before restoring
        const integrityCheck = await this.bundleSafetyService.validateBundleIntegrity(ctx, bundleId);
        if (!integrityCheck.isValid) {
            const issues = integrityCheck.issues.map(i => i.message).join(', ');
            throw new Error(`Cannot restore bundle due to integrity issues: ${issues}`);
        }
        
        Logger.info(`Restoring bundle ${bundleId} (${bundle.name})`, BundleLifecycleService.loggerCtx);
        
        bundle.status = BundleStatus.ACTIVE;
        bundle.brokenReason = undefined;
        bundle.lastRecomputedAt = new Date();
        bundle.updatedAt = new Date();
        
        const updatedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        
        // Log restore event (simplified event handling)
        Logger.info(
            `Bundle restored event: ${bundleId}`,
            BundleLifecycleService.loggerCtx
        );
        
        Logger.info(`Bundle ${bundleId} restored successfully`, BundleLifecycleService.loggerCtx);
        
        return updatedBundle;
    }
    
    /**
     * Validate if bundle status transition is allowed
     */
    isTransitionAllowed(from: BundleStatus, to: BundleStatus): boolean {
        const allowedTransitions: Record<BundleStatus, BundleStatus[]> = {
            [BundleStatus.DRAFT]: [BundleStatus.ACTIVE, BundleStatus.ARCHIVED],
            [BundleStatus.ACTIVE]: [BundleStatus.BROKEN, BundleStatus.ARCHIVED],
            [BundleStatus.BROKEN]: [BundleStatus.ACTIVE, BundleStatus.ARCHIVED],
            [BundleStatus.ARCHIVED]: [] // No transitions allowed from archived
        };
        
        return allowedTransitions[from]?.includes(to) || false;
    }
    
    /**
     * Get all available transitions for a bundle's current status
     */
    getAvailableTransitions(currentStatus: BundleStatus): Array<{
        status: BundleStatus;
        action: string;
        description: string;
    }> {
        const transitions: Record<BundleStatus, Array<{ status: BundleStatus; action: string; description: string }>> = {
            [BundleStatus.DRAFT]: [
                { status: BundleStatus.ACTIVE, action: 'publish', description: 'Publish bundle to make it available for purchase' },
                { status: BundleStatus.ARCHIVED, action: 'archive', description: 'Archive bundle without publishing' }
            ],
            [BundleStatus.ACTIVE]: [
                { status: BundleStatus.ARCHIVED, action: 'archive', description: 'Retire bundle from active use' }
            ],
            [BundleStatus.BROKEN]: [
                { status: BundleStatus.ACTIVE, action: 'restore', description: 'Restore bundle after fixing issues' },
                { status: BundleStatus.ARCHIVED, action: 'archive', description: 'Permanently retire broken bundle' }
            ],
            [BundleStatus.ARCHIVED]: [] // No transitions from archived
        };
        
        return transitions[currentStatus] || [];
    }
    
    /**
     * Get bundle lifecycle statistics
     */
    async getLifecycleStatistics(ctx: RequestContext): Promise<{
        totalBundles: number;
        draftBundles: number;
        activeBundles: number;
        brokenBundles: number;
        archivedBundles: number;
        recentTransitions: Array<{
            bundleId: ID;
            bundleName: string;
            fromStatus: string;
            toStatus: string;
            timestamp: Date;
            reason?: string;
        }>;
    }> {
        const repo = this.connection.getRepository(ctx, Bundle);
        
        // Get counts by status
        const [totalBundles, draftBundles, activeBundles, brokenBundles, archivedBundles] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: BundleStatus.DRAFT } }),
            repo.count({ where: { status: BundleStatus.ACTIVE } }),
            repo.count({ where: { status: BundleStatus.BROKEN } }),
            repo.count({ where: { status: BundleStatus.ARCHIVED } })
        ]);
        
        // Get recent transitions (this would ideally come from an audit log table)
        // For now, we'll get recently updated bundles as a proxy
        const recentlyUpdated = await repo.find({
            order: { updatedAt: 'DESC' },
            take: 10,
            select: ['id', 'name', 'status', 'updatedAt', 'brokenReason']
        });
        
        const recentTransitions = recentlyUpdated.map(bundle => ({
            bundleId: bundle.id,
            bundleName: bundle.name,
            fromStatus: 'unknown', // Would need audit log to track this
            toStatus: bundle.status,
            timestamp: bundle.updatedAt,
            reason: bundle.brokenReason
        }));
        
        return {
            totalBundles,
            draftBundles,
            activeBundles,
            brokenBundles,
            archivedBundles,
            recentTransitions
        };
    }
    
    /**
     * Bulk status update for maintenance operations
     */
    async bulkUpdateStatus(
        ctx: RequestContext, 
        bundleIds: ID[], 
        toStatus: BundleStatus, 
        reason?: string
    ): Promise<{
        successCount: number;
        errors: Array<{ bundleId: ID; error: string }>;
    }> {
        const results = {
            successCount: 0,
            errors: [] as Array<{ bundleId: ID; error: string }>
        };
        
        for (const bundleId of bundleIds) {
            try {
                switch (toStatus) {
                    case BundleStatus.ACTIVE:
                        const currentBundle = await this.bundleService.findOne(ctx, bundleId);
                        if (currentBundle?.status === BundleStatus.BROKEN) {
                            await this.restoreBundle(ctx, bundleId);
                        } else if (currentBundle?.status === BundleStatus.DRAFT) {
                            await this.publishBundle(ctx, bundleId);
                        }
                        break;
                    case BundleStatus.ARCHIVED:
                        await this.archiveBundle(ctx, bundleId, reason);
                        break;
                    case BundleStatus.BROKEN:
                        await this.markBundleBroken(ctx, bundleId, reason || 'Bulk operation');
                        break;
                    default:
                        throw new Error(`Bulk operation not supported for status: ${toStatus}`);
                }
                results.successCount++;
                
            } catch (error) {
                results.errors.push({
                    bundleId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        
        Logger.info(
            `Bulk status update completed: ${results.successCount} success, ${results.errors.length} errors`,
            BundleLifecycleService.loggerCtx
        );
        
        return results;
    }
}
