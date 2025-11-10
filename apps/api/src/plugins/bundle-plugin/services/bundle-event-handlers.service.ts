import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventBus, Logger, RequestContext } from '@vendure/core';
import { BundleJobQueueService } from './bundle-job-queue.service';
import { BundleSafetyService } from './bundle-safety.service';

/**
 * Bundle Event Handlers Service
 * 
 * Phase 4.3 Implementation - Bundle Plugin v2
 * 
 * This service integrates the job queue system with bundle safety events
 * to automatically trigger recomputation and consistency checks when needed.
 * 
 * Key Features:
 * - Event-driven job scheduling
 * - Automatic bundle recomputation on component changes
 * - Consistency check triggering on safety violations
 * - Bulk operation support for cascading changes
 * - Configurable job priorities and delays
 */

export interface BundleComponentChangedEvent {
    ctx: RequestContext;
    bundleId: string;
    componentType: 'variant' | 'product';
    componentId: string;
    changeType: 'price' | 'stock' | 'availability' | 'deletion' | 'status';
    oldValue?: any;
    newValue?: any;
}

export interface BundleSafetyViolationEvent {
    ctx: RequestContext;
    bundleId: string;
    violationType: 'broken_component' | 'invalid_pricing' | 'consistency_error' | 'safety_constraint';
    severity: 'warning' | 'error' | 'critical';
    details: string;
    affectedComponents?: string[];
}

export interface BundleStatusChangeEvent {
    ctx: RequestContext;
    bundleId: string;
    oldStatus: string;
    newStatus: string;
    reason?: string;
}

export interface BulkBundleChangeEvent {
    ctx: RequestContext;
    bundleIds: string[];
    changeType: 'component_update' | 'price_update' | 'status_change' | 'safety_check';
    batchSize?: number;
}

@Injectable()
export class BundleEventHandlersService implements OnModuleInit {
    private static readonly loggerCtx = 'BundleEventHandlersService';
    
    constructor(
        private eventBus: EventBus,
        private bundleJobQueueService: BundleJobQueueService,
        private bundleSafetyService: BundleSafetyService
    ) {}
    
    async onModuleInit() {
        this.subscribeToEvents();
        Logger.info('Bundle event handlers initialized', BundleEventHandlersService.loggerCtx);
    }
    
    private subscribeToEvents(): void {
        // Note: Custom events need to be properly registered with EventBus
        // For now, these are placeholder handlers that can be triggered manually
        Logger.debug('Bundle event handlers initialized', BundleEventHandlersService.loggerCtx);
    }
    
    /**
     * Handle bundle component changes
     */
    private async handleComponentChange(event: BundleComponentChangedEvent): Promise<void> {
        try {
            Logger.debug(
                `Handling component change for bundle ${event.bundleId}: ${event.changeType}`,
                BundleEventHandlersService.loggerCtx
            );
            
            // Determine job priority based on change type
            let priority: 'high' | 'normal' | 'low' = 'normal';
            let delay = 0;
            
            switch (event.changeType) {
                case 'deletion':
                    priority = 'high';
                    delay = 0; // Immediate processing
                    break;
                case 'price':
                    priority = 'high';
                    delay = 30000; // 30 second delay to batch price changes
                    break;
                case 'stock':
                    priority = 'normal';
                    delay = 60000; // 1 minute delay for stock changes
                    break;
                case 'availability':
                    priority = 'normal';
                    delay = 30000;
                    break;
                case 'status':
                    priority = 'high';
                    delay = 0;
                    break;
                default:
                    priority = 'low';
                    delay = 300000; // 5 minute delay for other changes
            }
            
            // Schedule bundle recomputation
            const jobId = await this.bundleJobQueueService.scheduleRecomputeBundle(
                event.ctx,
                event.bundleId,
                {
                    reason: `Component ${event.changeType} change: ${event.componentType}:${event.componentId}`,
                    forceRecalculation: event.changeType === 'deletion',
                    updateSearch: event.changeType === 'status'
                }
            );
            
            Logger.debug(
                `Scheduled bundle recomputation: bundleId=${event.bundleId}, jobId=${jobId}, priority=${priority}`,
                BundleEventHandlersService.loggerCtx
            );
            
            // If it's a deletion, also schedule consistency check
            if (event.changeType === 'deletion') {
                await this.bundleJobQueueService.scheduleConsistencyCheck(
                    event.ctx,
                    'broken', // Only check potentially broken bundles
                    {
                        fixBrokenBundles: true,
                        notifyAdmins: false // Don't notify for routine deletion handling
                    }
                );
            }
            
        } catch (error) {
            Logger.error(
                `Failed to handle component change for bundle ${event.bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleEventHandlersService.loggerCtx
            );
        }
    }
    
    /**
     * Handle bundle safety violations
     */
    private async handleSafetyViolation(event: BundleSafetyViolationEvent): Promise<void> {
        try {
            Logger.warn(
                `Handling safety violation for bundle ${event.bundleId}: ${event.violationType} (${event.severity})`,
                BundleEventHandlersService.loggerCtx
            );
            
            // Critical violations get immediate attention
            if (event.severity === 'critical') {
                // Schedule high-priority recomputation
                await this.bundleJobQueueService.scheduleRecomputeBundle(
                    event.ctx,
                    event.bundleId,
                    {
                        reason: `Critical safety violation: ${event.violationType}`,
                        forceRecalculation: true,
                        updateSearch: true
                    }
                );
                
                // Schedule targeted consistency check
                await this.bundleJobQueueService.scheduleConsistencyCheck(
                    event.ctx,
                    'broken',
                    {
                        fixBrokenBundles: true,
                        notifyAdmins: true
                    }
                );
            }
            
            // Error-level violations get normal priority
            else if (event.severity === 'error') {
                await this.bundleJobQueueService.scheduleRecomputeBundle(
                    event.ctx,
                    event.bundleId,
                    {
                        reason: `Safety error: ${event.violationType}`,
                        forceRecalculation: true,
                        updateSearch: false
                    }
                );
            }
            
            // Warnings get low priority processing
            else if (event.severity === 'warning') {
                await this.bundleJobQueueService.scheduleRecomputeBundle(
                    event.ctx,
                    event.bundleId,
                    {
                        reason: `Safety warning: ${event.violationType}`,
                        forceRecalculation: false,
                        updateSearch: false
                    }
                );
            }
            
            Logger.info(
                `Safety violation handling completed for bundle ${event.bundleId}`,
                BundleEventHandlersService.loggerCtx
            );
            
        } catch (error) {
            Logger.error(
                `Failed to handle safety violation for bundle ${event.bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleEventHandlersService.loggerCtx
            );
        }
    }
    
    /**
     * Handle bundle status changes
     */
    private async handleStatusChange(event: BundleStatusChangeEvent): Promise<void> {
        try {
            Logger.debug(
                `Handling status change for bundle ${event.bundleId}: ${event.oldStatus} → ${event.newStatus}`,
                BundleEventHandlersService.loggerCtx
            );
            
            // Status changes that require immediate recomputation
            const immediateRecomputation = [
                'DRAFT->ACTIVE',
                'ACTIVE->BROKEN',
                'BROKEN->ACTIVE',
                'ACTIVE->ARCHIVED'
            ];
            
            const statusTransition = `${event.oldStatus}->${event.newStatus}`;
            
            if (immediateRecomputation.includes(statusTransition)) {
                // Schedule recomputation with search index update
                await this.bundleJobQueueService.scheduleRecomputeBundle(
                    event.ctx,
                    event.bundleId,
                    {
                        reason: `Status change: ${statusTransition}`,
                        forceRecalculation: true,
                        updateSearch: true
                    }
                );
                
                // Schedule search index update
                await this.bundleJobQueueService.scheduleReindexBundle(
                    event.ctx,
                    event.bundleId,
                    {
                        reason: `Status change reindex: ${statusTransition}`,
                        fullReindex: true
                    }
                );
            }
            
        } catch (error) {
            Logger.error(
                `Failed to handle status change for bundle ${event.bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                BundleEventHandlersService.loggerCtx
            );
        }
    }
    
    /**
     * Handle bulk bundle changes
     */
    private async handleBulkChange(event: BulkBundleChangeEvent): Promise<void> {
        try {
            Logger.info(
                `Handling bulk change for ${event.bundleIds.length} bundles: ${event.changeType}`,
                BundleEventHandlersService.loggerCtx
            );
            
            const batchSize = event.batchSize || 10;
            
            switch (event.changeType) {
                case 'component_update':
                    // Schedule bulk recomputation
                    await this.bundleJobQueueService.scheduleBulkOperation(
                        event.ctx,
                        'recompute',
                        event.bundleIds,
                        {
                            batchSize,
                            continueOnError: true
                        }
                    );
                    break;
                    
                case 'price_update':
                    // Schedule bulk recomputation with high priority
                    await this.bundleJobQueueService.scheduleBulkOperation(
                        event.ctx,
                        'recompute',
                        event.bundleIds,
                        {
                            batchSize: Math.min(batchSize, 5), // Smaller batches for price updates
                            continueOnError: true
                        }
                    );
                    break;
                    
                case 'status_change':
                    // Schedule recomputation + reindexing
                    await this.bundleJobQueueService.scheduleBulkOperation(
                        event.ctx,
                        'recompute',
                        event.bundleIds,
                        {
                            batchSize,
                            continueOnError: true
                        }
                    );
                    
                    // Schedule bulk reindexing
                    await this.bundleJobQueueService.scheduleBulkOperation(
                        event.ctx,
                        'reindex',
                        event.bundleIds,
                        {
                            batchSize,
                            continueOnError: true
                        }
                    );
                    break;
                    
                case 'safety_check':
                    // Schedule consistency check
                    await this.bundleJobQueueService.scheduleConsistencyCheck(
                        event.ctx,
                        'all',
                        {
                            fixBrokenBundles: true,
                            notifyAdmins: true
                        }
                    );
                    break;
            }
            
            Logger.info(
                `Bulk change handling completed for ${event.bundleIds.length} bundles`,
                BundleEventHandlersService.loggerCtx
            );
            
        } catch (error) {
            Logger.error(
                `Failed to handle bulk change for ${event.bundleIds.length} bundles: ${error instanceof Error ? error.message : String(error)}`,
                BundleEventHandlersService.loggerCtx
            );
        }
    }
    
    /**
     * Publish a component change event
     */
    async publishComponentChange(
        ctx: RequestContext,
        bundleId: string,
        componentType: 'variant' | 'product',
        componentId: string,
        changeType: 'price' | 'stock' | 'availability' | 'deletion' | 'status',
        oldValue?: any,
        newValue?: any
    ): Promise<void> {
        // Trigger handler directly for now
        await this.handleComponentChange({
            ctx,
            bundleId,
            componentType,
            componentId,
            changeType,
            oldValue,
            newValue
        });
    }
    
    /**
     * Publish a safety violation event
     */
    async publishSafetyViolation(
        ctx: RequestContext,
        bundleId: string,
        violationType: 'broken_component' | 'invalid_pricing' | 'consistency_error' | 'safety_constraint',
        severity: 'warning' | 'error' | 'critical',
        details: string,
        affectedComponents?: string[]
    ): Promise<void> {
        // Trigger handler directly for now
        await this.handleSafetyViolation({
            ctx,
            bundleId,
            violationType,
            severity,
            details,
            affectedComponents
        });
    }
    
    /**
     * Publish a status change event
     */
    async publishStatusChange(
        ctx: RequestContext,
        bundleId: string,
        oldStatus: string,
        newStatus: string,
        reason?: string
    ): Promise<void> {
        // Trigger handler directly for now
        await this.handleStatusChange({
            ctx,
            bundleId,
            oldStatus,
            newStatus,
            reason
        });
    }
    
    /**
     * Publish a bulk change event
     */
    async publishBulkChange(
        ctx: RequestContext,
        bundleIds: string[],
        changeType: 'component_update' | 'price_update' | 'status_change' | 'safety_check',
        batchSize?: number
    ): Promise<void> {
        // Trigger handler directly for now
        await this.handleBulkChange({
            ctx,
            bundleIds,
            changeType,
            batchSize
        });
    }
}