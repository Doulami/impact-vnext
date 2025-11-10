import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import {
    DataService,
    NotificationService,
    ServerConfigService,
} from '@vendure/admin-ui/core';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';

const GET_BUNDLE = gql`
    query GetBundle($id: ID!) {
        bundle(id: $id) {
            id
            createdAt
            updatedAt
            name
            slug
            description
            assets
            price
            enabled
            tags
            category
            items {
                id
                productVariant {
                    id
                    name
                    sku
                    price
                }
                quantity
                unitPrice
                displayOrder
            }
        }
    }
`;

const CREATE_BUNDLE = gql`
    mutation CreateBundle($input: CreateBundleInput!) {
        createBundle(input: $input) {
            id
            name
            price
        }
    }
`;

const UPDATE_BUNDLE = gql`
    mutation UpdateBundle($input: UpdateBundleInput!) {
        updateBundle(input: $input) {
            id
            name
            price
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

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private formBuilder: FormBuilder,
        private dataService: DataService,
        private notificationService: NotificationService,
        private changeDetector: ChangeDetectorRef,
    ) {
        this.bundleForm = this.formBuilder.group({
            name: ['', Validators.required],
            slug: [''],
            description: [''],
            price: [0, [Validators.required, Validators.min(0)]],
            enabled: [true],
            tags: [[]],
            category: [''],
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
        if (!term || term.length < 2) {
            this.variantSearchResults = [];
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
                price: bundle.price,
                enabled: bundle.enabled,
                tags: bundle.tags || [],
                category: bundle.category,
            });

            // Populate items
            bundle.items.forEach((item: any) => {
                this.items.push(this.createBundleItemFormGroup(item));
            });

            this.loadAnalytics(id);
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
            // Only include id for updates, not for creation
            if (!this.isNew && item.id) {
                itemData.id = item.id;
            }
            return itemData;
        });

        if (this.isNew) {
            const input = {
                name: formValue.name,
                slug: formValue.slug || undefined,
                description: formValue.description || undefined,
                assets: [],
                price: parseFloat(formValue.price) || 0,
                enabled: formValue.enabled,
                tags: formValue.tags || [],
                category: formValue.category || undefined,
                items,
            };

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
            const input = {
                id: this.bundle.id,
                name: formValue.name,
                slug: formValue.slug || undefined,
                description: formValue.description || undefined,
                price: parseFloat(formValue.price) || 0,
                enabled: formValue.enabled,
                tags: formValue.tags || [],
                category: formValue.category || undefined,
                items,
            };

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
}
