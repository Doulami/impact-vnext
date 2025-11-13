import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { 
    BaseListComponent, 
    DataService, 
    ModalService, 
    NotificationService,
    LogicalOperator,
    SortOrder
} from '@vendure/admin-ui/core';

import { Bundle, BundleFilterParameter, BundleSortParameter } from '../../types/bundle.types';
import { BundleDataService } from '../../providers/bundle-data.service';

/**
 * Bundle List Component
 * 
 * Phase 4.2 Implementation - Bundle Plugin v2
 * 
 * Displays a comprehensive list of all bundles with:
 * - Status-based filtering (DRAFT, ACTIVE, BROKEN, ARCHIVED)
 * - Search by name, category, tags
 * - Sort by various criteria
 * - Quick actions (publish, archive, view)
 * - Bulk operations
 * - Health indicators
 */
@Component({
    selector: 'bundle-list',
    templateUrl: './bundle-list.component.html',
    styleUrls: ['./bundle-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BundleListComponent extends BaseListComponent<Bundle, BundleFilterParameter, BundleSortParameter> implements OnInit {
    
    readonly filters = [
        {
            name: 'status',
            type: { kind: 'select' as const },
            label: 'Status',
            filterField: 'status',
            options: [
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'BROKEN', label: 'Broken' },
                { value: 'EXPIRED', label: 'Expired' },
                { value: 'ARCHIVED', label: 'Archived' }
            ]
        },
        {
            name: 'category',
            type: { kind: 'text' as const },
            label: 'Category',
            filterField: 'category'
        },
        {
            name: 'discountType',
            type: { kind: 'select' as const },
            label: 'Discount Type',
            filterField: 'discountType',
            options: [
                { value: 'fixed', label: 'Fixed Price' },
                { value: 'percent', label: 'Percentage Off' }
            ]
        }
    ];
    
    readonly sorts = [
        { name: 'status', label: 'Status' },
        { name: 'createdAt', label: 'Created' },
        { name: 'updatedAt', label: 'Updated' },
        { name: 'effectivePrice', label: 'Effective Price' }
    ];

    constructor(
        private bundleDataService: BundleDataService,
        private router: Router,
        private modalService: ModalService,
        private notificationService: NotificationService,
        protected dataService: DataService
    ) {
        super();
    }

    ngOnInit() {
        super.ngOnInit();
    }

    protected loadPage(): Observable<{ items: Bundle[]; totalItems: number }> {
        const options = {
            skip: this.currentPage * this.itemsPerPage,
            take: this.itemsPerPage,
            filter: this.createFilterInput(),
            sort: this.createSortInput()
        };
        
        return this.bundleDataService.getBundles(options);
    }

    private createFilterInput(): BundleFilterParameter {
        const filters: BundleFilterParameter = {};
        
        for (const filterControl of this.filterControls) {
            const value = filterControl.value;
            if (value) {
                if (filterControl.name === 'status') {
                    filters.status = { eq: value };
                } else if (filterControl.name === 'category') {
                    filters.category = { contains: value };
                } else if (filterControl.name === 'discountType') {
                    filters.discountType = { eq: value };
                }
            }
        }
        
        // Add search term filter
        if (this.searchTermControl.value) {
            filters.name = { contains: this.searchTermControl.value };
        }
        
        return filters;
    }

    private createSortInput(): BundleSortParameter {
        if (this.sortControl.value) {
            return {
                [this.sortControl.value]: this.sortDirectionControl.value === 'ASC' 
                    ? SortOrder.ASC 
                    : SortOrder.DESC
            } as BundleSortParameter;
        }
        return { updatedAt: SortOrder.DESC };
    }

    // Bundle-specific actions
    
    onCreateBundle() {
        this.router.navigate(['./create'], { relativeTo: this.route });
    }
    
    onEditBundle(bundle: Bundle) {
        this.router.navigate(['./', bundle.id, 'edit'], { relativeTo: this.route });
    }
    
    onViewBundle(bundle: Bundle) {
        this.router.navigate(['./', bundle.id], { relativeTo: this.route });
    }

    async onPublishBundle(bundle: Bundle) {
        if (bundle.status !== 'DRAFT') {
            return;
        }
        
        try {
            await this.bundleDataService.publishBundle(bundle.id).toPromise();
            this.notificationService.success(`Bundle "${bundle.name}" published successfully`);
            this.refresh();
        } catch (error) {
            this.notificationService.error(`Failed to publish bundle: ${error.message}`);
        }
    }

    async onArchiveBundle(bundle: Bundle) {
        if (bundle.status !== 'ACTIVE') {
            return;
        }
        
        const result = await this.modalService.dialog({
            title: 'Archive Bundle',
            body: `Are you sure you want to archive "${bundle.name}"? This will make it unavailable for purchase.`,
            buttons: [
                { type: 'secondary', label: 'Cancel' },
                { type: 'danger', label: 'Archive', returnValue: true }
            ]
        }).toPromise();
        
        if (result) {
            try {
                await this.bundleDataService.archiveBundle(bundle.id, 'Manual archive').toPromise();
                this.notificationService.success(`Bundle "${bundle.name}" archived successfully`);
                this.refresh();
            } catch (error) {
                this.notificationService.error(`Failed to archive bundle: ${error.message}`);
            }
        }
    }

    async onRestoreBundle(bundle: Bundle) {
        if (bundle.status !== 'BROKEN') {
            return;
        }
        
        try {
            await this.bundleDataService.restoreBundle(bundle.id).toPromise();
            this.notificationService.success(`Bundle "${bundle.name}" restored successfully`);
            this.refresh();
        } catch (error) {
            this.notificationService.error(`Failed to restore bundle: ${error.message}`);
        }
    }

    // Status helpers
    
    getStatusColor(status: string): string {
        const colors = {
            'DRAFT': 'warning',
            'ACTIVE': 'success',
            'BROKEN': 'error',
            'EXPIRED': 'error',
            'ARCHIVED': 'secondary'
        };
        return colors[status] || 'secondary';
    }
    
    getStatusIcon(status: string): string {
        const icons = {
            'DRAFT': 'edit',
            'ACTIVE': 'check-circle',
            'BROKEN': 'exclamation-triangle',
            'EXPIRED': 'clock',
            'ARCHIVED': 'archive'
        };
        return icons[status] || 'help';
    }

    canPublish(bundle: Bundle): boolean {
        return bundle.status === 'DRAFT';
    }
    
    canArchive(bundle: Bundle): boolean {
        return bundle.status === 'ACTIVE';
    }
    
    canRestore(bundle: Bundle): boolean {
        return bundle.status === 'BROKEN';
    }

    // Bulk operations
    
    async onBulkPublish() {
        const selectedBundles = this.selection.selected.filter(b => b.status === 'DRAFT');
        if (selectedBundles.length === 0) {
            this.notificationService.info('No draft bundles selected');
            return;
        }

        const result = await this.modalService.dialog({
            title: 'Bulk Publish',
            body: `Publish ${selectedBundles.length} bundle(s)?`,
            buttons: [
                { type: 'secondary', label: 'Cancel' },
                { type: 'primary', label: 'Publish', returnValue: true }
            ]
        }).toPromise();

        if (result) {
            let successCount = 0;
            for (const bundle of selectedBundles) {
                try {
                    await this.bundleDataService.publishBundle(bundle.id).toPromise();
                    successCount++;
                } catch (error) {
                    console.error(`Failed to publish bundle ${bundle.id}:`, error);
                }
            }
            
            this.notificationService.success(`Published ${successCount} of ${selectedBundles.length} bundles`);
            this.refresh();
            this.selection.clear();
        }
    }

    async onBulkArchive() {
        const selectedBundles = this.selection.selected.filter(b => b.status === 'ACTIVE');
        if (selectedBundles.length === 0) {
            this.notificationService.info('No active bundles selected');
            return;
        }

        const result = await this.modalService.dialog({
            title: 'Bulk Archive',
            body: `Archive ${selectedBundles.length} bundle(s)? They will no longer be available for purchase.`,
            buttons: [
                { type: 'secondary', label: 'Cancel' },
                { type: 'danger', label: 'Archive', returnValue: true }
            ]
        }).toPromise();

        if (result) {
            let successCount = 0;
            for (const bundle of selectedBundles) {
                try {
                    await this.bundleDataService.archiveBundle(bundle.id, 'Bulk archive').toPromise();
                    successCount++;
                } catch (error) {
                    console.error(`Failed to archive bundle ${bundle.id}:`, error);
                }
            }
            
            this.notificationService.success(`Archived ${successCount} of ${selectedBundles.length} bundles`);
            this.refresh();
            this.selection.clear();
        }
    }
}