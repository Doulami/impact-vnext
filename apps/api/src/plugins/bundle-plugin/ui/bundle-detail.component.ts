import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    NotificationService,
    ModalService,
    AssetPickerDialogComponent,
    GetActiveChannelDocument,
} from '@vendure/admin-ui/core';
import { CurrencyCode } from '@vendure/common/lib/generated-types';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { distinctUntilChanged, shareReplay } from 'rxjs/operators';

const GET_BUNDLE = gql`
    query GetBundle($id: ID!) {
        bundle(id: $id) {
            id
            createdAt
            updatedAt
            name
            slug
            description
            discountType
            fixedPrice
            percentOff
            status
            version
            tags
            category
            assets {
                id
                name
                preview
                source
            }
            featuredAsset {
                id
                name
                preview
                source
            }
            validFrom
            validTo
            bundleCap
            bundleReservedOpen
            bundleVirtualStock
            shellProductId
            effectivePrice
            totalSavings
            items {
                id
                quantity
                unitPrice
                weight
                displayOrder
                productVariant {
                    id
                    name
                    sku
                }
            }
        }
    }
`;

const CREATE_BUNDLE = gql`
    mutation CreateBundle($input: CreateBundleInput!) {
        createBundle(input: $input) {
            id
            name
            discountType
            fixedPrice
            percentOff
            status
        }
    }
`;

const UPDATE_BUNDLE = gql`
    mutation UpdateBundle($input: UpdateBundleInput!) {
        updateBundle(input: $input) {
            id
            name
            discountType
            fixedPrice
            percentOff
            status
            version
        }
    }
`;

const DELETE_BUNDLE = gql`
    mutation DeleteBundle($id: ID!) {
        deleteBundle(id: $id) {
            result
            message
        }
    }
`;

const PUBLISH_BUNDLE = gql`
    mutation PublishBundle($id: ID!) {
        publishBundle(id: $id) {
            id
            status
            version
        }
    }
`;

const ARCHIVE_BUNDLE = gql`
    mutation ArchiveBundle($id: ID!, $reason: String) {
        archiveBundle(id: $id, reason: $reason) {
            id
            status
        }
    }
`;

const SEARCH_PRODUCT_VARIANTS = gql`
    query SearchProductVariants($term: String!, $take: Int) {
        search(input: { term: $term, take: $take, groupByProduct: false }) {
            items {
                productVariantId
                productVariantName
                sku
                price {
                    ... on SinglePrice {
                        value
                    }
                }
            }
        }
    }
`;

const GET_BUNDLE_ANALYTICS = gql`
    query GetBundleAnalytics($bundleId: ID!) {
        bundleAnalytics(bundleId: $bundleId) {
            bundleId
            totalComponents
            componentTotal
            bundlePrice
            totalSavings
            savingsPercentage
            totalWeight
            enabled
            availabilityStatus {
                valid
                constrainingVariants {
                    id
                    name
                }
                maxQuantityAvailable
                message
            }
        }
    }
`;

@Component({
    selector: 'bundle-detail',
    templateUrl: './bundle-detail.component.html',
    styleUrls: ['./bundle-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false,
})
export class BundleDetailComponent implements OnInit {
    bundleForm: FormGroup;
    bundle: any;
    analytics: any;
    isNew = false;
    variantSearchResults: any[] = [];
    activeSearchIndex: number | null = null;
    assetChanges: { assets: any[]; featuredAsset: any } = { assets: [], featuredAsset: null };
    
    readonly currencyCode$ = this.dataService
        .query(GetActiveChannelDocument)
        .mapStream(res => res.activeChannel.defaultCurrencyCode as CurrencyCode)
        .pipe(
            distinctUntilChanged(),
            shareReplay(1)
        );

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private formBuilder: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private changeDetector: ChangeDetectorRef,
        private modalService: ModalService,
    ) {
        this.bundleForm = this.formBuilder.group({
            name: ['', Validators.required],
            slug: [''],
            description: [''],
            discountType: ['fixed', Validators.required],
            fixedPrice: [0],
            percentOff: [0],
            tags: [[]],
            category: [''],
            // Phase 3 fields
            image: [''],
            validFrom: [null],
            validTo: [null],
            bundleCap: [null],
            items: this.formBuilder.array([]),
        });
    }

    ngOnInit() {
        this.route.params.subscribe(params => {
            const id = params['id'];
            if (id === 'create') {
                this.isNew = true;
                this.addBundleItem(); // Start with one item
                this.changeDetector.markForCheck();
            } else {
                this.isNew = false;
                this.loadBundle(id);
            }
        });
    }

    get items(): FormArray {
        return this.bundleForm.get('items') as FormArray;
    }

    createBundleItemFormGroup(item?: any): FormGroup {
        return this.formBuilder.group({
            id: [item?.id || null],
            productVariantId: [item?.productVariant?.id || '', Validators.required],
            productVariantName: [item?.productVariant?.name || ''],
            quantity: [item?.quantity || 1, [Validators.required, Validators.min(1)]],
            unitPrice: [item?.unitPrice || 0, [Validators.required, Validators.min(0)]],
            weight: [item?.weight || null],
            displayOrder: [item?.displayOrder || 0],
        });
    }

    addBundleItem() {
        this.items.push(this.createBundleItemFormGroup());
        this.changeDetector.markForCheck();
    }

    removeBundleItem(index: number) {
        this.items.removeAt(index);
        this.changeDetector.markForCheck();
    }

    searchVariants(term: string, index: number) {
        this.activeSearchIndex = index;
        
        if (!term || term.length < 2) {
            this.variantSearchResults = [];
            this.activeSearchIndex = null;
            return;
        }

        this.dataService
            .query(SEARCH_PRODUCT_VARIANTS, { term, take: 10 })
            .single$.subscribe((data: any) => {
                this.variantSearchResults = data.search?.items || [];
                this.changeDetector.markForCheck();
            });
    }

    selectVariant(variant: any, index: number) {
        const itemGroup = this.items.at(index) as FormGroup;
        itemGroup.patchValue({
            productVariantId: variant.productVariantId,
            productVariantName: variant.productVariantName,
            unitPrice: variant.price.value,
        });
        this.variantSearchResults = [];
        this.activeSearchIndex = null;
        this.changeDetector.markForCheck();
    }

    isSearchActive(index: number): boolean {
        return this.activeSearchIndex === index && this.variantSearchResults.length > 0;
    }

    onAssetChange(changes: any) {
        this.assetChanges = changes;
        this.bundleForm.markAsDirty();
        this.changeDetector.markForCheck();
    }

    private loadBundle(id: string) {
        this.dataService.query(GET_BUNDLE, { id }).single$.subscribe((data: any) => {
            const bundle = data.bundle;
            if (!bundle) {
                this.notificationService.error(_('Bundle not found'));
                this.router.navigate(['/extensions/bundles']);
                return;
            }

            this.bundle = bundle;
            
            // Populate form
            this.bundleForm.patchValue({
                name: bundle.name,
                slug: bundle.slug,
                description: bundle.description,
                discountType: bundle.discountType || 'fixed',
                // vdr-currency-input expects value in cents, no conversion needed
                fixedPrice: bundle.fixedPrice || 0,
                percentOff: bundle.percentOff || 0,
                tags: bundle.tags || [],
                category: bundle.category,
                // Phase 3 fields
                image: bundle.image || '',
                validFrom: bundle.validFrom ? new Date(bundle.validFrom).toISOString().slice(0, 16) : null,
                validTo: bundle.validTo ? new Date(bundle.validTo).toISOString().slice(0, 16) : null,
                bundleCap: bundle.bundleCap || null,
            });
            
            // Load assets - always set to ensure proper binding
            this.assetChanges = {
                assets: bundle.assets || [],
                featuredAsset: bundle.featuredAsset || (bundle.assets && bundle.assets[0]) || null
            };
            
            // Set validators based on discount type
            this.updateDiscountValidators(bundle.discountType);

            // Clear existing items before repopulating
            while (this.items.length > 0) {
                this.items.removeAt(0);
            }
            
            // Populate items
            bundle.items.forEach((item: any) => {
                this.items.push(this.createBundleItemFormGroup(item));
            });

            // Mark form as pristine after initial load
            this.bundleForm.markAsPristine();
            
            // TODO: Enable analytics once bundleAnalytics query is added to schema
            // this.loadAnalytics(id);
            this.changeDetector.markForCheck();
        });
    }

    private loadAnalytics(bundleId: string) {
        this.dataService
            .query(GET_BUNDLE_ANALYTICS, { bundleId })
            .single$.subscribe((data: any) => {
                this.analytics = data.bundleAnalytics;
                this.changeDetector.markForCheck();
            });
    }

    onDiscountTypeChange(type: string) {
        this.updateDiscountValidators(type);
        this.changeDetector.markForCheck();
    }

    private updateDiscountValidators(discountType: string) {
        const fixedPriceControl = this.bundleForm.get('fixedPrice');
        const percentOffControl = this.bundleForm.get('percentOff');
        
        if (discountType === 'fixed') {
            fixedPriceControl?.setValidators([Validators.required, Validators.min(0)]);
            percentOffControl?.clearValidators();
            percentOffControl?.setValue(null);
        } else {
            percentOffControl?.setValidators([Validators.required, Validators.min(0), Validators.max(100)]);
            fixedPriceControl?.clearValidators();
            fixedPriceControl?.setValue(null);
        }
        
        fixedPriceControl?.updateValueAndValidity();
        percentOffControl?.updateValueAndValidity();
    }

    save() {
        if (this.bundleForm.invalid) {
            this.notificationService.error(_('Please fill all required fields'));
            return;
        }

        const formValue = this.bundleForm.value;

        // Prepare items - remove display fields and ensure proper numeric values
        const items = formValue.items.map((item: any) => {
            const itemData: any = {
                productVariantId: item.productVariantId,
                quantity: parseInt(item.quantity, 10) || 1,
                unitPrice: parseFloat(item.unitPrice) || 0,
                displayOrder: parseInt(item.displayOrder, 10) || 0,
            };
            if (item.weight !== null && item.weight !== undefined) {
                itemData.weight = parseFloat(item.weight);
            }
            // Only include id for updates, not for creation
            if (!this.isNew && item.id) {
                itemData.id = item.id;
            }
            return itemData;
        });

        if (this.isNew) {
            const input: any = {
                name: formValue.name,
                slug: formValue.slug || undefined,
                description: formValue.description || undefined,
                assets: this.assetChanges.assets?.map((a: any) => a.id) || [],
                discountType: formValue.discountType,
                tags: formValue.tags || [],
                category: formValue.category || undefined,
                // Phase 3 fields
                image: formValue.image || undefined,
                validFrom: formValue.validFrom ? new Date(formValue.validFrom).toISOString() : undefined,
                validTo: formValue.validTo ? new Date(formValue.validTo).toISOString() : undefined,
                bundleCap: formValue.bundleCap ? parseInt(formValue.bundleCap, 10) : undefined,
                items,
            };
            
            if (formValue.discountType === 'fixed') {
                // vdr-currency-input already stores value in cents, no conversion needed
                input.fixedPrice = parseInt(formValue.fixedPrice, 10) || 0;
            } else {
                input.percentOff = parseFloat(formValue.percentOff) || 0;
            }

            this.dataService
                .mutate(CREATE_BUNDLE, { input })
                .subscribe((result: any) => {
                    if (result.createBundle) {
                        this.notificationService.success(_('Bundle created successfully'));
                        this.router.navigate(['/extensions/bundles', result.createBundle.id]);
                    }
                }, (err: any) => {
                    this.notificationService.error(_('Error creating bundle: ' + err.message));
                });
        } else {
            const input: any = {
                id: this.bundle.id,
                name: formValue.name,
                slug: formValue.slug || undefined,
                description: formValue.description || undefined,
                discountType: formValue.discountType,
                tags: formValue.tags || [],
                category: formValue.category || undefined,
                assets: this.assetChanges.assets?.map((a: any) => a.id) || [],
                // Phase 3 fields
                image: formValue.image || undefined,
                validFrom: formValue.validFrom ? new Date(formValue.validFrom).toISOString() : undefined,
                validTo: formValue.validTo ? new Date(formValue.validTo).toISOString() : undefined,
                bundleCap: formValue.bundleCap ? parseInt(formValue.bundleCap, 10) : undefined,
                items,
            };
            
            if (formValue.discountType === 'fixed') {
                // vdr-currency-input already stores value in cents, no conversion needed
                input.fixedPrice = parseInt(formValue.fixedPrice, 10) || 0;
            } else {
                input.percentOff = parseFloat(formValue.percentOff) || 0;
            }

            this.dataService
                .mutate(UPDATE_BUNDLE, { input })
                .subscribe(() => {
                    this.notificationService.success(_('Bundle updated successfully'));
                    this.loadBundle(this.bundle.id);
                }, (err: any) => {
                    this.notificationService.error(_('Error updating bundle: ' + err.message));
                });
        }
    }

    delete() {
        if (!confirm(_('Are you sure you want to delete this bundle?'))) {
            return;
        }

        this.dataService
            .mutate(DELETE_BUNDLE, { id: this.bundle.id })
            .subscribe((result: any) => {
                const deleteBundle = result.deleteBundle;
                if (deleteBundle.result === 'DELETED') {
                    this.notificationService.success(_('Bundle deleted successfully'));
                    this.router.navigate(['/extensions/bundles']);
                } else {
                    this.notificationService.error(
                        _('Error deleting bundle: ' + deleteBundle.message)
                    );
                }
            }, (err: any) => {
                this.notificationService.error(_('Error deleting bundle: ' + err.message));
            });
    }

    cancel() {
        this.router.navigate(['/extensions/bundles']);
    }

    publish() {
        if (!this.bundle || this.bundle.status !== 'DRAFT') {
            return;
        }

        if (!confirm(_('Are you sure you want to publish this bundle? It will become available for purchase.'))) {
            return;
        }

        this.dataService
            .mutate(PUBLISH_BUNDLE, { id: this.bundle.id })
            .subscribe((result: any) => {
                this.notificationService.success(_('Bundle published successfully'));
                this.loadBundle(this.bundle.id);
            }, (err: any) => {
                this.notificationService.error(_('Error publishing bundle: ' + err.message));
            });
    }

    archive() {
        if (!this.bundle || this.bundle.status !== 'ACTIVE') {
            return;
        }

        if (!confirm(_('Are you sure you want to archive this bundle? It will no longer be available for purchase.'))) {
            return;
        }

        this.dataService
            .mutate(ARCHIVE_BUNDLE, { id: this.bundle.id, reason: 'Manual archive' })
            .subscribe((result: any) => {
                this.notificationService.success(_('Bundle archived successfully'));
                this.loadBundle(this.bundle.id);
            }, (err: any) => {
                this.notificationService.error(_('Error archiving bundle: ' + err.message));
            });
    }

    canPublish(): boolean {
        return this.bundle?.status === 'DRAFT';
    }

    canArchive(): boolean {
        return this.bundle?.status === 'ACTIVE';
    }

    async selectImage() {
        const assets = await this.modalService
            .fromComponent(AssetPickerDialogComponent, {
                size: 'xl',
                closable: true,
                locals: {
                    multiSelect: false,
                },
            })
            .toPromise();

        if (assets && assets.length > 0) {
            const asset = assets[0];
            this.bundleForm.patchValue({
                image: asset.preview
            });
            this.changeDetector.markForCheck();
        }
    }

    getStatusColor(status: string): string {
        const colors: { [key: string]: string } = {
            'DRAFT': 'warning',
            'ACTIVE': 'success',
            'BROKEN': 'error',
            'ARCHIVED': 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getStatusIcon(status: string): string {
        const icons: { [key: string]: string } = {
            'DRAFT': 'edit',
            'ACTIVE': 'check-circle',
            'BROKEN': 'exclamation-triangle',
            'ARCHIVED': 'archive'
        };
        return icons[status] || 'help';
    }

    /**
     * Check if bundle is overbooked (Reserved > Cap) - Phase 2 v3
     */
    isOverbooked(): boolean {
        if (!this.bundle || !this.bundle.bundleCap) {
            return false;
        }
        return (this.bundle.bundleReservedOpen || 0) > this.bundle.bundleCap;
    }
}
