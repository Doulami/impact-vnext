import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

interface BundleFragment {
  id: string;
  name: string;
  description: string;
  status: string;
  discountType: string;
  fixedPrice: number;
  percentOff: number;
  validFrom?: string;
  validTo?: string;
  bundleCap?: number;
  allowExternalPromos: boolean;
  effectivePrice: number;
  totalSavings: number;
  bundleVirtualStock?: number;
  items: Array<{
    id: string;
    productVariant: {
      id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    displayOrder: number;
  }>;
}

const GET_BUNDLE = gql`
  query GetBundle($id: ID!) {
    bundle(id: $id) {
      id
      name
      description
      status
      discountType
      fixedPrice
      percentOff
      validFrom
      validTo
      bundleCap
      allowExternalPromos
      effectivePrice
      totalSavings
      bundleVirtualStock
      items {
        id
        productVariant {
          id
          name
          sku
        }
        quantity
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
      status
    }
  }
`;

const UPDATE_BUNDLE = gql`
  mutation UpdateBundle($input: UpdateBundleInput!) {
    updateBundle(input: $input) {
      id
      name
      status
    }
  }
`;

const PUBLISH_BUNDLE = gql`
  mutation PublishBundle($id: ID!) {
    publishBundle(id: $id) {
      id
      status
    }
  }
`;

const GET_SERVER_CONFIG = gql`
  query GetServerConfig {
    globalSettings {
      serverConfig {
        moneyStrategyPrecision
      }
    }
    activeChannel {
      defaultCurrencyCode
    }
  }
`;

@Component({
  selector: 'bundle-variant-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, ReactiveFormsModule, RouterModule],
  template: `
    <vdr-page-block>
      <vdr-action-bar>
        <vdr-ab-left>
          <vdr-page-title
            [title]="isNew ? 'Create Bundle' : 'Edit Bundle'"
          ></vdr-page-title>
          <div *ngIf="!isNew" class="status-badge" [class]="'status-' + bundle?.status">
            {{ bundle?.status }}
          </div>
        </vdr-ab-left>
        <vdr-ab-right>
          <button class="btn btn-secondary" (click)="cancel()">
            {{ 'common.cancel' | translate }}
          </button>
          <button
            class="btn btn-primary"
            (click)="save()"
            [disabled]="bundleForm.invalid || saving"
          >
            <clr-icon shape="floppy" *ngIf="!saving"></clr-icon>
            <span *ngIf="saving" class="spinner spinner-inline"></span>
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
          <button
            *ngIf="!isNew && bundle?.status === 'DRAFT'"
            class="btn btn-success"
            (click)="publish()"
          >
            <clr-icon shape="play"></clr-icon>
            Publish
          </button>
        </vdr-ab-right>
      </vdr-action-bar>
    </vdr-page-block>

    <form [formGroup]="bundleForm" *ngIf="!loading">
      <!-- Discount Configuration -->
      <vdr-page-block>
        <vdr-card title="Discount Configuration">
          <div class="clr-row">
            <div class="clr-col-md-4">
              <vdr-form-field label="Discount Type">
                <select formControlName="discountType" class="clr-select">
                  <option value="fixed">Fixed Price</option>
                  <option value="percent">Percentage Off</option>
                </select>
              </vdr-form-field>
            </div>
            <div class="clr-col-md-4" *ngIf="bundleForm.get('discountType')?.value === 'fixed'">
              <vdr-form-field label="Fixed Price">
                <vdr-currency-input
                  formControlName="fixedPrice"
                  [currencyCode]="(currencyCode$ | async) ?? 'USD'"
                ></vdr-currency-input>
              </vdr-form-field>
            </div>
            <div class="clr-col-md-4" *ngIf="bundleForm.get('discountType')?.value === 'percent'">
              <vdr-form-field label="Percentage Off">
                <input
                  type="number"
                  formControlName="percentOff"
                  class="clr-input"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </vdr-form-field>
            </div>
          </div>
        </vdr-card>
      </vdr-page-block>


      <!-- Bundle Components -->
      <vdr-page-block>
        <vdr-card title="Bundle Components">
          <div class="table-actions">
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              (click)="addItem()"
            >
              <clr-icon shape="plus"></clr-icon>
              Add Component
            </button>
          </div>

          <vdr-data-table-2
            *ngIf="items.length > 0"
            [items]="itemsForTable"
            [itemsPerPage]="50"
            id="bundle-items-table"
          >
            <vdr-dt2-column id="variant" [heading]="'Product Variant'" [expand]="true">
              <ng-template let-item="item">
                <div class="variant-edit-container">
                  <div class="selected-variant" *ngIf="item.productVariantId">
                    <div class="variant-name">{{ item.productVariantName }}</div>
                    <div class="sku-text">SKU: {{ item.productVariantSku }}</div>
                  </div>
                  <div class="variant-selector-wrapper" *ngIf="item.editing">
                    <vdr-product-variant-selector
                      (productSelected)="onProductVariantSelected($event, item.index)">
                    </vdr-product-variant-selector>
                    <span class="search-hint">Search by product name or SKU</span>
                  </div>
                </div>
              </ng-template>
            </vdr-dt2-column>

            <vdr-dt2-column id="quantity" [heading]="'Quantity'">
              <ng-template let-item="item">
                <input
                  type="number"
                  [value]="item.quantity"
                  [disabled]="!item.editing"
                  (change)="updateItemQuantity(item.index, $event)"
                  class="clr-input clr-input-sm"
                  min="1"
                />
              </ng-template>
            </vdr-dt2-column>

            <vdr-dt2-column id="displayOrder" [heading]="'Display Order'">
              <ng-template let-item="item">
                <input
                  type="number"
                  [value]="item.displayOrder"
                  [disabled]="!item.editing"
                  (change)="updateItemDisplayOrder(item.index, $event)"
                  class="clr-input clr-input-sm"
                  min="0"
                />
              </ng-template>
            </vdr-dt2-column>

            <vdr-dt2-column id="actions" [heading]="'Actions'" [optional]="false">
              <ng-template let-item="item">
                <button
                  type="button"
                  class="btn btn-icon btn-sm"
                  (click)="toggleEdit(item.index)"
                  [title]="item.editing === true ? 'Save changes' : 'Edit row'"
                >
                  <clr-icon [attr.shape]="item.editing === true ? 'check' : 'pencil'"></clr-icon>
                </button>
                <button
                  type="button"
                  class="btn btn-icon btn-sm"
                  (click)="removeItem(item.index)"
                  [disabled]="items.length === 1"
                  title="Remove item"
                >
                  <clr-icon shape="trash"></clr-icon>
                </button>
              </ng-template>
            </vdr-dt2-column>
          </vdr-data-table-2>

          <div *ngIf="items.length === 0" class="empty-state">
            <clr-icon shape="layers" size="48"></clr-icon>
            <h3>No bundle components</h3>
            <p>Add product variants to create your bundle</p>
            <button type="button" class="btn btn-primary" (click)="addItem()">
              <clr-icon shape="plus"></clr-icon>
              Add First Component
            </button>
          </div>
        </vdr-card>
      </vdr-page-block>

      <!-- Advanced Settings -->
      <vdr-page-block>
        <vdr-card title="Advanced Settings">
          <div class="clr-row">
            <div class="clr-col-md-4">
              <vdr-form-field label="Valid From" for="validFrom">
                <vdr-datetime-picker
                  id="validFrom"
                  formControlName="validFrom"
                ></vdr-datetime-picker>
              </vdr-form-field>
            </div>
            <div class="clr-col-md-4">
              <vdr-form-field label="Valid To" for="validTo">
                <vdr-datetime-picker
                  id="validTo"
                  formControlName="validTo"
                ></vdr-datetime-picker>
              </vdr-form-field>
            </div>
            <div class="clr-col-md-4">
              <vdr-form-field label="Bundle Cap" for="bundleCap">
                <input
                  id="bundleCap"
                  type="number"
                  formControlName="bundleCap"
                  class="clr-input"
                  min="1"
                />
              </vdr-form-field>
            </div>
          </div>
          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-form-field label="Allow External Promotions">
                <vdr-affixed-input>
                  <input
                    type="hidden"
                    formControlName="allowExternalPromos"
                  />
                  <clr-toggle-wrapper>
                    <input
                      type="checkbox"
                      clrToggle
                      [checked]="bundleForm.get('allowExternalPromos')?.value"
                      (change)="toggleExternalPromos($event)"
                    />
                    <label>{{ bundleForm.get('allowExternalPromos')?.value ? 'ON' : 'OFF' }}</label>
                  </clr-toggle-wrapper>
                </vdr-affixed-input>
              </vdr-form-field>
              <p class="help-text">Whether external promotion codes/coupons can be applied to this bundle</p>
              <p class="help-text"><strong>OFF:</strong> Promotion codes and coupons will NOT apply to this bundle (prevents double-discounting).</p>
              <p class="help-text"><strong>ON:</strong> External promotions can apply (bundle discount + promo discount).</p>
            </div>
          </div>
        </vdr-card>
      </vdr-page-block>
    </form>

    <div *ngIf="loading" class="loading-spinner">
      <clr-spinner>Loading...</clr-spinner>
    </div>
  `,
  styles: [`
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 12px;
    }
    .status-DRAFT {
      background: #ffc107;
      color: #000;
    }
    .status-ACTIVE {
      background: #28a745;
      color: #fff;
    }
    .status-ARCHIVED {
      background: #6c757d;
      color: #fff;
    }
    .computed-fields {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .computed-field {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
    }
    .computed-field .label {
      display: block;
      font-size: 12px;
      color: #6c757d;
      margin-bottom: 4px;
    }
    .computed-field .value {
      display: block;
      font-size: 18px;
      font-weight: 600;
      color: #2c75ff;
    }
    .table-actions {
      margin-bottom: 16px;
    }
    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .variant-edit-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .variant-selector-wrapper {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .search-hint {
      font-size: 12px;
      color: #6c757d;
    }
    .selected-variant {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .variant-name {
      font-weight: 500;
    }
    .sku-text {
      font-size: 12px;
      color: #6c757d;
    }
    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .empty-state clr-icon {
      color: #ccc;
      margin-bottom: 16px;
    }
    .help-text {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  `]
})
export class BundleVariantDetailComponent implements OnInit, OnDestroy {
  bundleForm: FormGroup;
  bundle: BundleFragment | null = null;
  productId: string;
  productName: string;
  bundleId: string;
  isNew = false;
  loading = false;
  saving = false;
  currencyCode$: Observable<string>;
  protected destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private changeDetector: ChangeDetectorRef
  ) {
    this.currencyCode$ = this.dataService
      .query(GET_SERVER_CONFIG)
      .mapStream((data: any) => data.activeChannel?.defaultCurrencyCode || 'USD');

    this.bundleForm = this.formBuilder.group({
      discountType: ['fixed', Validators.required],
      fixedPrice: [0],
      percentOff: [0],
      validFrom: [null],
      validTo: [null],
      bundleCap: [null],
      allowExternalPromos: [false],
      items: this.formBuilder.array([this.createItemGroup()])
    });
  }

  get items(): FormArray {
    return this.bundleForm.get('items') as FormArray;
  }

  ngOnInit() {
    this.productId = this.route.parent?.parent?.snapshot.params.id;

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id'] === 'create') {
        this.isNew = true;
        this.productName = this.route.snapshot.queryParams['productName'];
        this.loading = false;
      } else {
        this.bundleId = params['id'];
        this.isNew = false;
        this.loadBundle();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createItemGroup(item?: any): FormGroup {
    const isExisting = !!item;
    return this.formBuilder.group({
      productVariantId: [item?.productVariant?.id || '', Validators.required],
      productVariantName: [item?.productVariant?.name || ''],
      productVariantSku: [item?.productVariant?.sku || ''],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      displayOrder: [item?.displayOrder ?? 0],
      editing: [!isExisting],
    });
  }

  loadBundle() {
    this.loading = true;
    this.changeDetector.detectChanges();

    this.dataService.query(GET_BUNDLE, { id: this.bundleId })
      .mapStream((data: any) => data.bundle)
      .subscribe({
        next: (bundle) => {
          this.bundle = bundle;
          this.populateForm();
          this.loading = false;
          this.changeDetector.detectChanges();
        },
        error: (error) => {
          this.notificationService.error(error.message);
          this.loading = false;
          this.changeDetector.detectChanges();
        }
      });
  }

  populateForm() {
    if (!this.bundle) return;

    // Sort items by displayOrder to preserve existing order
    const sortedItems = [...(this.bundle.items || [])].sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    this.bundleForm.patchValue({
      discountType: this.bundle.discountType,
      fixedPrice: this.bundle.fixedPrice,
      percentOff: this.bundle.percentOff,
      validFrom: this.bundle.validFrom,
      validTo: this.bundle.validTo,
      bundleCap: this.bundle.bundleCap,
      allowExternalPromos: this.bundle.allowExternalPromos
    });

    while (this.items.length) {
      this.items.removeAt(0);
    }

    sortedItems.forEach((item: any) => {
      this.items.push(this.createItemGroup(item));
    });
  }

  addItem() {
    this.items.push(this.createItemGroup());
    this.changeDetector.markForCheck();
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  async save() {
    if (this.bundleForm.invalid) {
      this.notificationService.error('Please fix form errors');
      return;
    }

    this.saving = true;
    const formValue = this.bundleForm.value;

    const input: any = {
      discountType: formValue.discountType,
      fixedPrice: formValue.discountType === 'fixed' ? formValue.fixedPrice : null,
      percentOff: formValue.discountType === 'percent' ? formValue.percentOff : null,
      validFrom: formValue.validFrom,
      validTo: formValue.validTo,
      bundleCap: formValue.bundleCap,
      allowExternalPromos: formValue.allowExternalPromos,
      items: formValue.items.map((item: any) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        displayOrder: item.displayOrder ?? 0,
      }))
    };

    // For creation, pass shell product ID and name
    if (this.isNew) {
      input.name = this.productName || 'Bundle';
      input.shellProductId = this.productId;
    }

    try {
      if (this.isNew) {
        const result = await this.dataService.mutate(CREATE_BUNDLE, { input }).toPromise();
        this.bundleId = (result as any).createBundle.id;
        this.isNew = false;
        this.notificationService.success('Bundle created successfully');
        this.router.navigate(['../'], { relativeTo: this.route });
      } else {
        input.id = this.bundleId;
        await this.dataService.mutate(UPDATE_BUNDLE, { input }).toPromise();
        this.notificationService.success('Bundle updated successfully');
        this.loadBundle();
      }
    } catch (error: any) {
      this.notificationService.error(error.message);
    } finally {
      this.saving = false;
    }
  }

  async publish() {
    try {
      await this.dataService.mutate(PUBLISH_BUNDLE, { id: this.bundleId }).toPromise();
      this.notificationService.success('Bundle published successfully');
      this.loadBundle();
    } catch (error: any) {
      this.notificationService.error(error.message);
    }
  }

  cancel() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  get itemsForTable() {
    return this.items.controls.map((control, index) => ({
      index,
      productVariantId: control.get('productVariantId')?.value,
      productVariantName: control.get('productVariantName')?.value,
      productVariantSku: control.get('productVariantSku')?.value,
      quantity: control.get('quantity')?.value,
      displayOrder: control.get('displayOrder')?.value,
      editing: control.get('editing')?.value ?? false,
    }));
  }

  onProductVariantSelected(variant: any, index: number) {
    const itemControl = this.items.at(index);
    
    // vdr-product-variant-selector can emit different structures
    const variantId = variant.id || variant.productVariantId;
    const variantName = variant.name || variant.productVariantName || variant.productName;
    const variantSku = variant.sku || variant.productSku;
    
    itemControl.patchValue({
      productVariantId: variantId,
      productVariantName: variantName,
      productVariantSku: variantSku,
      editing: false,
    });
    
    this.changeDetector.detectChanges();
  }

  toggleEdit(index: number) {
    const itemControl = this.items.at(index);
    const current = !!itemControl.get('editing')?.value;
    itemControl.patchValue({ editing: !current });
    this.changeDetector.markForCheck();
  }

  updateItemQuantity(index: number, event: any) {
    const itemControl = this.items.at(index);
    itemControl.patchValue({
      quantity: parseInt(event.target.value, 10)
    });
    this.changeDetector.markForCheck();
  }

  updateItemDisplayOrder(index: number, event: any) {
    const itemControl = this.items.at(index);
    itemControl.patchValue({
      displayOrder: parseInt(event.target.value, 10)
    });
    this.changeDetector.markForCheck();
  }

  toggleExternalPromos(event: any) {
    this.bundleForm.patchValue({
      allowExternalPromos: event.target.checked
    });
  }
}
