import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, NotificationService, ModalService, SharedModule, TypedBaseListComponent } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';

const GET_NUTRITION_BATCH_LIST = gql`
  query GetNutritionBatchList($options: NutritionBatchListOptions, $variantId: ID!) {
    nutritionBatches(options: $options, variantId: $variantId) {
      items {
        id
        batchCode
        productionDate
        expiryDate
        isCurrentForWebsite
        servingSizeValue
        servingSizeUnit
        servingLabel
      }
      totalItems
    }
  }
`;

const DUPLICATE_BATCH = gql`
  mutation DuplicateNutritionBatch($id: ID!) {
    duplicateNutritionBatch(id: $id) {
      id
      batchCode
    }
  }
`;

const DELETE_BATCH = gql`
  mutation DeleteNutritionBatch($id: ID!) {
    deleteNutritionBatch(id: $id) {
      result
    }
  }
`;

const SET_CURRENT_BATCH = gql`
  mutation SetCurrentNutritionBatch($batchId: ID!) {
    setCurrentNutritionBatch(batchId: $batchId) {
      id
      isCurrentForWebsite
    }
  }
`;

@Component({
  selector: 'nutrition-batch-tab',
  standalone: true,
  imports: [SharedModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet></router-outlet>
    <div class="nutrition-batch-tab" *ngIf="!hasChildRoute">
      <vdr-action-bar>
        <vdr-ab-left>
          <button
            class="button primary"
            (click)="createBatch()"
          >
            <clr-icon shape="plus"></clr-icon>
            {{ 'nutrition-batch.create-batch' | translate }}
          </button>
        </vdr-ab-left>
      </vdr-action-bar>

      <vdr-data-table-2
        id="nutrition-batch-list"
        [items]="items$ | async"
        [itemsPerPage]="itemsPerPage$ | async"
        [totalItems]="totalItems$ | async"
        [currentPage]="currentPage$ | async"
        (pageChange)="setPageNumber($event)"
        (itemsPerPageChange)="setItemsPerPage($event)"
      >
        <vdr-dt2-column
          id="batch-code"
          [heading]="'nutrition-batch.batch-code' | translate"
          [sort]="sorts.get('batchCode')"
        >
          <ng-template let-batch="item">
            <a class="button-ghost" [routerLink]="['./', batch.id]">
              {{ batch.batchCode }}
            </a>
            <span
              *ngIf="batch.isCurrentForWebsite"
              class="badge badge-success"
            >
              {{ 'nutrition-batch.current-badge' | translate }}
            </span>
          </ng-template>
        </vdr-dt2-column>

        <vdr-dt2-column
          id="production-date"
          [heading]="'nutrition-batch.production-date' | translate"
          [sort]="sorts.get('productionDate')"
        >
          <ng-template let-batch="item">
            {{ batch.productionDate | date }}
          </ng-template>
        </vdr-dt2-column>

        <vdr-dt2-column
          id="expiry-date"
          [heading]="'nutrition-batch.expiry-date' | translate"
          [sort]="sorts.get('expiryDate')"
        >
          <ng-template let-batch="item">
            {{ batch.expiryDate | date }}
            <span
              *ngIf="isExpired(batch.expiryDate)"
              class="badge badge-danger"
            >
              {{ 'nutrition-batch.expired-badge' | translate }}
            </span>
          </ng-template>
        </vdr-dt2-column>

        <vdr-dt2-column
          id="serving-size"
          [heading]="'nutrition-batch.serving-size' | translate"
        >
          <ng-template let-batch="item">
            {{ batch.servingSizeValue }} {{ batch.servingSizeUnit }}
          </ng-template>
        </vdr-dt2-column>

        <vdr-dt2-column
          id="current"
          [heading]="'nutrition-batch.current-for-website' | translate"
        >
          <ng-template let-batch="item">
            <button
              *ngIf="!batch.isCurrentForWebsite"
              class="button-small"
              (click)="setAsCurrent(batch.id)"
            >
              {{ 'nutrition-batch.set-as-current' | translate }}
            </button>
          </ng-template>
        </vdr-dt2-column>

        <vdr-dt2-column id="actions" [heading]="''">
          <ng-template let-batch="item">
            <vdr-dropdown>
              <button class="icon-button" vdrDropdownTrigger>
                <clr-icon shape="ellipsis-vertical"></clr-icon>
              </button>
              <vdr-dropdown-menu vdrPosition="bottom-right">
                <button
                  type="button"
                  class="dropdown-item"
                  (click)="editBatch(batch.id)"
                >
                  <clr-icon shape="pencil"></clr-icon>
                  {{ 'nutrition-batch.edit-batch' | translate }}
                </button>
                <button
                  type="button"
                  class="dropdown-item"
                  (click)="duplicateBatch(batch.id)"
                >
                  <clr-icon shape="copy"></clr-icon>
                  {{ 'nutrition-batch.duplicate-batch' | translate }}
                </button>
                <button
                  type="button"
                  class="dropdown-item"
                  (click)="deleteBatch(batch.id)"
                >
                  <clr-icon shape="trash"></clr-icon>
                  {{ 'nutrition-batch.delete-batch' | translate }}
                </button>
              </vdr-dropdown-menu>
            </vdr-dropdown>
          </ng-template>
        </vdr-dt2-column>
      </vdr-data-table-2>
    </div>
  `,
  styles: [`
    .nutrition-batch-tab {
      padding: 20px;
    }
    .badge {
      margin-left: 8px;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 3px;
    }
    .badge-success {
      background-color: #60b515;
      color: white;
    }
    .badge-danger {
      background-color: #c92100;
      color: white;
    }
  `]
})
export class NutritionBatchTabComponent extends TypedBaseListComponent<typeof GET_NUTRITION_BATCH_LIST, 'nutritionBatches'> implements OnInit {
  variantId!: string;
  hasChildRoute = false;

  readonly sorts = this.createSortCollection()
    .defaultSort('createdAt', 'DESC')
    .addSort({ name: 'batchCode' })
    .addSort({ name: 'productionDate' })
    .addSort({ name: 'expiryDate' })
    .connectToRoute(this.route);

  constructor(
    protected route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private notificationService: NotificationService,
    private modalService: ModalService,
    private changeDetector: ChangeDetectorRef
  ) {
    super();
    
    // Get variantId from parent route
    this.variantId = this.route.parent?.snapshot.params.id || this.route.snapshot.params.id;

    super.configure({
      document: GET_NUTRITION_BATCH_LIST,
      getItems: data => data.nutritionBatches,
      setVariables: (skip, take) => ({
        options: {
          skip,
          take,
          sort: this.sorts.createSortInput(),
        },
        variantId: this.variantId,
      }),
      refreshListOnChanges: [this.sorts.valueChanges],
    });
  }

  ngOnInit() {
    super.ngOnInit();
    
    // Check for child routes and subscribe to router events
    this.router.events.subscribe(() => {
      const previousState = this.hasChildRoute;
      
      // Check both route.firstChild AND URL to determine if we're on list or detail
      const url = this.router.url;
      const onListView = url.endsWith('nutrition-batches') || url.includes('nutrition-batches?');
      this.hasChildRoute = !onListView;
      
      // Reload batches when returning from child route to list
      if (previousState && !this.hasChildRoute) {
        this.refresh();
        this.changeDetector.detectChanges();
      }
    });
    
    // Initial check using URL
    const url = this.router.url;
    const onListView = url.endsWith('nutrition-batches') || url.includes('nutrition-batches?');
    this.hasChildRoute = !onListView;
  }

  createBatch() {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  editBatch(batchId: string) {
    this.router.navigate([batchId], { relativeTo: this.route });
  }

  async duplicateBatch(batchId: string) {
    try {
      await this.dataService
        .mutate(DUPLICATE_BATCH, { id: batchId })
        .toPromise();

      this.notificationService.success('nutrition-batch.batch-duplicated');
      this.refresh();
    } catch (error: any) {
      this.notificationService.error(error.message);
    }
  }

  async deleteBatch(batchId: string) {
    this.modalService
      .dialog({
        title: 'nutrition-batch.delete-batch',
        body: 'nutrition-batch.confirm-delete',
        buttons: [
          { type: 'secondary', label: 'common.cancel' },
          { type: 'danger', label: 'common.delete', returnValue: true },
        ],
      })
      .subscribe((result) => {
        if (result) {
          this.dataService.mutate(DELETE_BATCH, { id: batchId }).subscribe({
            next: () => {
              this.notificationService.success('nutrition-batch.batch-deleted');
              this.refresh();
            },
            error: (error: any) => {
              this.notificationService.error(error.message);
            },
          });
        }
      });
  }

  async setAsCurrent(batchId: string) {
    try {
      await this.dataService
        .mutate(SET_CURRENT_BATCH, { batchId })
        .toPromise();

      this.notificationService.success('nutrition-batch.set-current-success');
      this.refresh();
    } catch (error: any) {
      this.notificationService.error(error.message);
    }
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }
}
