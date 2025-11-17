import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, NotificationService, ModalService, SharedModule } from '@vendure/admin-ui/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { gql } from 'graphql-tag';

const GET_NUTRITION_BATCHES = gql`
  query GetNutritionBatches($variantId: ID!) {
    nutritionBatches(variantId: $variantId) {
      id
      batchCode
      productionDate
      expiryDate
      isCurrentForWebsite
      servingSizeValue
      servingSizeUnit
      servingLabel
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
  imports: [CommonModule, SharedModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <router-outlet></router-outlet>
    <div class="nutrition-batch-tab" *ngIf="!hasChildRoute">
      <!-- Debug line -->
      <div style="padding:4px;font-size:11px;color:#999">
        debug — batches length: {{ (batches$ | async)?.length }}
      </div>

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

      <ng-container *ngIf="batches$ | async as batches">
        <!-- Empty state -->
        <ng-container *ngIf="batches.length === 0; else batchList">
          <vdr-card>
            <vdr-card-title>{{ 'nutrition-batch.no-batches' | translate }}</vdr-card-title>
            <vdr-card-subtitle>{{ 'nutrition-batch.create-first-batch' | translate }}</vdr-card-subtitle>
          </vdr-card>
        </ng-container>

        <!-- Non-empty state -->
        <ng-template #batchList>
          <vdr-card>
            <vdr-card-title>{{ 'nutrition-batch.batches-list' | translate }}</vdr-card-title>
            <vdr-card-content>
          <table class="table">
            <thead>
              <tr>
                <th>{{ 'nutrition-batch.batch-code' | translate }}</th>
                <th>{{ 'nutrition-batch.production-date' | translate }}</th>
                <th>{{ 'nutrition-batch.expiry-date' | translate }}</th>
                <th>{{ 'nutrition-batch.serving-size' | translate }}</th>
                <th>{{ 'nutrition-batch.current-for-website' | translate }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let batch of batches">
                <td>
                  <a [routerLink]="['./', batch.id]">{{ batch.batchCode }}</a>
                  <span
                    *ngIf="batch.isCurrentForWebsite"
                    class="badge badge-success"
                  >
                    {{ 'nutrition-batch.current-badge' | translate }}
                  </span>
                </td>
                <td>{{ batch.productionDate | date }}</td>
                <td>
                  {{ batch.expiryDate | date }}
                  <span
                    *ngIf="isExpired(batch.expiryDate)"
                    class="badge badge-danger"
                  >
                    {{ 'nutrition-batch.expired-badge' | translate }}
                  </span>
                </td>
                <td>
                  {{ batch.servingSizeValue }}
                  {{ batch.servingSizeUnit }}
                </td>
                <td>
                  <button
                    *ngIf="!batch.isCurrentForWebsite"
                    class="button-small"
                    (click)="setAsCurrent(batch.id)"
                  >
                    {{ 'nutrition-batch.set-as-current' | translate }}
                  </button>
                </td>
                <td class="actions">
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
                </td>
              </tr>
            </tbody>
          </table>
            </vdr-card-content>
          </vdr-card>
        </ng-template>
      </ng-container>
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
    .actions {
      text-align: right;
    }
  `]
})
export class NutritionBatchTabComponent implements OnInit {
  variantId!: string;
  batches$!: Observable<any[]>;
  hasChildRoute = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private notificationService: NotificationService,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    // Get variantId from parent route (product-variant-detail)
    this.variantId = this.route.parent?.snapshot.params.id || this.route.snapshot.params.id;
    console.log('[NutritionBatchTab] ngOnInit - variantId:', this.variantId);
    
    // Check for child routes and subscribe to router events
    this.router.events.subscribe(() => {
      const previousState = this.hasChildRoute;
      this.hasChildRoute = this.route.firstChild !== null;
      
      // Reload batches when returning from child route to list
      if (previousState && !this.hasChildRoute) {
        console.log('[NutritionBatchTab] Reloading batches');
        this.loadBatches();
      }
    });
    
    // Initial check
    this.hasChildRoute = this.route.firstChild !== null;
    
    if (!this.hasChildRoute) {
      this.loadBatches();
    }
  }

  loadBatches() {
    console.log('[NutritionBatchTab] loadBatches called with variantId:', this.variantId);
    this.batches$ = this.dataService
      .query(GET_NUTRITION_BATCHES, { variantId: this.variantId })
      .mapStream((data: any) => {
        console.log('[NutritionBatchTab] Query response:', data);
        const batches = data?.nutritionBatches ?? [];
        console.log('[NutritionBatchTab] Batches:', batches);
        return batches;
      });
  }

  createBatch() {
    this.router.navigate(['new'], { relativeTo: this.route });
  }

  editBatch(batchId: string) {
    this.router.navigate([batchId], { relativeTo: this.route });
  }

  async duplicateBatch(batchId: string) {
    try {
      const result = await this.dataService
        .mutate(DUPLICATE_BATCH, { id: batchId })
        .toPromise();

      this.notificationService.success('nutrition-batch.batch-duplicated');
      this.loadBatches();
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
              this.loadBatches();
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
      this.loadBatches();
    } catch (error: any) {
      this.notificationService.error(error.message);
    }
  }

  isExpired(expiryDate: string): boolean {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }
}
