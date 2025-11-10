import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataService } from '@vendure/admin-ui/core';
import { 
    Bundle, 
    BundleListOptions,
    CreateBundleInput,
    UpdateBundleInput,
    BundleIntegrityResult,
    VariantDeletionCheck,
    BundleLifecycleStats
} from '../types/bundle.types';

/**
 * Bundle Data Service
 * 
 * Phase 4.2 Implementation - Bundle Plugin v2
 * 
 * Handles all GraphQL communications for bundle operations:
 * - CRUD operations for bundles
 * - Bundle lifecycle management (publish, archive, restore)
 * - Bundle validation and safety checks
 * - Bundle statistics and analytics
 */
@Injectable({
    providedIn: 'root'
})
export class BundleDataService {
    
    constructor(private dataService: DataService) {}
    
    // Bundle CRUD Operations
    
    getBundles(options?: BundleListOptions): Observable<{ items: Bundle[]; totalItems: number }> {
        return this.dataService.query(GET_BUNDLES, { options }).pipe(
            map(data => data.bundles)
        );
    }
    
    getBundle(id: string): Observable<Bundle> {
        return this.dataService.query(GET_BUNDLE, { id }).pipe(
            map(data => data.bundle)
        );
    }
    
    createBundle(input: CreateBundleInput): Observable<Bundle> {
        return this.dataService.mutate(CREATE_BUNDLE, { input }).pipe(
            map(data => data.createBundle)
        );
    }
    
    updateBundle(input: UpdateBundleInput): Observable<Bundle> {
        return this.dataService.mutate(UPDATE_BUNDLE, { input }).pipe(
            map(data => data.updateBundle)
        );
    }
    
    deleteBundle(id: string): Observable<{ result: string; message?: string }> {
        return this.dataService.mutate(DELETE_BUNDLE, { id }).pipe(
            map(data => data.deleteBundle)
        );
    }
    
    // Bundle Lifecycle Operations
    
    publishBundle(id: string): Observable<Bundle> {
        return this.dataService.mutate(PUBLISH_BUNDLE, { id }).pipe(
            map(data => data.publishBundle)
        );
    }
    
    archiveBundle(id: string, reason?: string): Observable<Bundle> {
        return this.dataService.mutate(ARCHIVE_BUNDLE, { id, reason }).pipe(
            map(data => data.archiveBundle)
        );
    }
    
    markBundleBroken(id: string, reason: string): Observable<Bundle> {
        return this.dataService.mutate(MARK_BUNDLE_BROKEN, { id, reason }).pipe(
            map(data => data.markBundleBroken)
        );
    }
    
    restoreBundle(id: string): Observable<Bundle> {
        return this.dataService.mutate(RESTORE_BUNDLE, { id }).pipe(
            map(data => data.restoreBundle)
        );
    }
    
    // Bundle Validation and Safety
    
    validateBundleIntegrity(id: string): Observable<BundleIntegrityResult> {
        return this.dataService.query(VALIDATE_BUNDLE_INTEGRITY, { id }).pipe(
            map(data => data.validateBundleIntegrity)
        );
    }
    
    canDeleteVariant(variantId: string): Observable<VariantDeletionCheck> {
        return this.dataService.query(CAN_DELETE_VARIANT, { variantId }).pipe(
            map(data => data.canDeleteVariant)
        );
    }
    
    getBundleLifecycleStatistics(): Observable<BundleLifecycleStats> {
        return this.dataService.query(GET_BUNDLE_LIFECYCLE_STATISTICS).pipe(
            map(data => data.getBundleLifecycleStatistics)
        );
    }
}

// GraphQL Fragments
const BUNDLE_FRAGMENT = `
    fragment Bundle on Bundle {
        id
        createdAt
        updatedAt
        name
        slug
        description
        status
        discountType
        fixedPrice
        percentOff
        version
        assets
        price
        enabled
        tags
        category
        allowExternalPromos
        brokenReason
        lastRecomputedAt
        isAvailable
        effectivePrice
        totalSavings
        items {
            id
            createdAt
            updatedAt
            quantity
            unitPrice
            unitPriceSnapshot
            weight
            displayOrder
            productVariant {
                id
                name
                price
                enabled
                stockOnHand
                trackInventory
                product {
                    id
                    name
                    slug
                    enabled
                    featuredAsset {
                        id
                        name
                        preview
                        source
                    }
                }
            }
        }
    }
`;

// GraphQL Queries
const GET_BUNDLES = `
    query GetBundles($options: BundleListOptions) {
        bundles(options: $options) {
            items {
                ...Bundle
            }
            totalItems
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const GET_BUNDLE = `
    query GetBundle($id: ID!) {
        bundle(id: $id) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const VALIDATE_BUNDLE_INTEGRITY = `
    query ValidateBundleIntegrity($id: ID!) {
        validateBundleIntegrity(id: $id) {
            isValid
            issues {
                type
                variantId
                message
            }
        }
    }
`;

const CAN_DELETE_VARIANT = `
    query CanDeleteVariant($variantId: ID!) {
        canDeleteVariant(variantId: $variantId) {
            canDelete
            blockingBundles {
                id
                name
                status
            }
        }
    }
`;

const GET_BUNDLE_LIFECYCLE_STATISTICS = `
    query GetBundleLifecycleStatistics {
        getBundleLifecycleStatistics {
            totalBundles
            draftBundles
            activeBundles
            brokenBundles
            archivedBundles
            recentTransitions {
                bundleId
                bundleName
                fromStatus
                toStatus
                timestamp
                reason
            }
        }
    }
`;

// GraphQL Mutations
const CREATE_BUNDLE = `
    mutation CreateBundle($input: CreateBundleInput!) {
        createBundle(input: $input) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const UPDATE_BUNDLE = `
    mutation UpdateBundle($input: UpdateBundleInput!) {
        updateBundle(input: $input) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const DELETE_BUNDLE = `
    mutation DeleteBundle($id: ID!) {
        deleteBundle(id: $id) {
            result
            message
        }
    }
`;

const PUBLISH_BUNDLE = `
    mutation PublishBundle($id: ID!) {
        publishBundle(id: $id) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const ARCHIVE_BUNDLE = `
    mutation ArchiveBundle($id: ID!, $reason: String) {
        archiveBundle(id: $id, reason: $reason) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const MARK_BUNDLE_BROKEN = `
    mutation MarkBundleBroken($id: ID!, $reason: String!) {
        markBundleBroken(id: $id, reason: $reason) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;

const RESTORE_BUNDLE = `
    mutation RestoreBundle($id: ID!) {
        restoreBundle(id: $id) {
            ...Bundle
        }
    }
    ${BUNDLE_FRAGMENT}
`;