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
import { BundleTranslationService } from './bundle-translation.service';

/**
 * Bundle Lifecycle Service
 * 
 * Phase 4.1 Implementation - Bundle Plugin v2
 * 
 * This service manages bundle status transitions and lifecycle operations:
 * - DRAFT → ACTIVE (publish bundle)
 * 
 * Key Features:
 * - Status transition validation
 * - Version management (increment on publish)
 * - Integration with safety service for validation
 * 
 * Note: Bundles are hard-deleted (not archived). Status is computed at runtime:
 * - isExpired: validTo has passed
 * - isBroken: components are missing/deleted
 */
@Injectable()
export class BundleLifecycleService {
    private static readonly loggerCtx = 'BundleLifecycleService';
    
    constructor(
        private connection: TransactionalConnection,
        private bundleService: BundleService,
        private bundleSafetyService: BundleSafetyService,
        private eventBus: EventBus,
        private translationService: BundleTranslationService
    ) {}
    
    /**
     * Publish bundle: DRAFT → ACTIVE
     * Increments version and validates bundle integrity
     */
    async publishBundle(ctx: RequestContext, bundleId: ID): Promise<Bundle> {
        const bundle = await this.bundleService.findOne(ctx, bundleId);
        
        if (!bundle) {
            throw new Error(this.translationService.bundleNotFound(ctx, String(bundleId)));
        }
        
        if (bundle.status !== BundleStatus.DRAFT) {
            throw new Error(this.translationService.cannotPublishDraft(ctx));
        }
        
        // Validate bundle configuration
        const errors = bundle.validate();
        if (errors.length > 0) {
            throw new Error(this.translationService.cannotPublishDraft(ctx));
        }
        
        // Validate bundle integrity (all components available)
        const integrityCheck = await this.bundleSafetyService.validateBundleIntegrity(ctx, bundleId);
        if (!integrityCheck.isValid) {
            throw new Error(this.translationService.cannotPublishBroken(ctx));
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
     * Get bundle lifecycle statistics
     */
    async getLifecycleStatistics(ctx: RequestContext): Promise<{
        totalBundles: number;
        draftBundles: number;
        activeBundles: number;
        expiredCount: number;
        brokenCount: number;
    }> {
        const repo = this.connection.getRepository(ctx, Bundle);
        
        // Get counts by database status (only DRAFT and ACTIVE)
        const [totalBundles, draftBundles, activeBundles] = await Promise.all([
            repo.count(),
            repo.count({ where: { status: BundleStatus.DRAFT } }),
            repo.count({ where: { status: BundleStatus.ACTIVE } })
        ]);
        
        // Get all active bundles to count expired and broken (computed states)
        const activeBundlesList = await repo.find({ where: { status: BundleStatus.ACTIVE }, relations: ['items'] });
        
        // Count computed states
        let expiredCount = 0;
        let brokenCount = 0;
        
        for (const bundle of activeBundlesList) {
            if (bundle.isExpired) expiredCount++;
            if (bundle.isBroken) brokenCount++;
        }
        
        return {
            totalBundles,
            draftBundles,
            activeBundles,
            expiredCount,
            brokenCount
        };
    }
}
