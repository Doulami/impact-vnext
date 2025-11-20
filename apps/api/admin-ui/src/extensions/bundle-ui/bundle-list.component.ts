import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';

@Component({
  selector: 'bundle-list',
  standalone: false,
  template: `
    <vdr-page-block>
      <vdr-action-bar>
        <vdr-ab-left>
          <vdr-page-title [title]="'bundle-plugin.bundles' | translate" icon="layers"></vdr-page-title>
        </vdr-ab-left>
        <vdr-ab-right>
          <button class="btn btn-primary" (click)="createBundle()">
            <clr-icon shape="plus"></clr-icon>
            {{ 'bundle-plugin.create-bundle' | translate }}
          </button>
        </vdr-ab-right>
      </vdr-action-bar>
    </vdr-page-block>

    <!-- Global Promotion Policy Settings -->
    <vdr-page-block>
      <vdr-card>
        <h3 class="mb-3">{{ 'bundle-plugin.global-promotion-policy' | translate }}</h3>
        <div class="alert alert-warning mb-3">
          <clr-icon shape="exclamation-triangle" class="is-warning"></clr-icon>
          <strong>{{ 'bundle-plugin.warning' | translate }}:</strong> {{ 'bundle-plugin.global-policy-warning' | translate }}
        </div>
        
        <div class="clr-row">
          <div class="clr-col-md-6">
            <label for="globalPolicy" class="clr-control-label">{{ 'bundle-plugin.site-wide-promotion-policy' | translate }}</label>
            <select 
              clrSelect
              id="globalPolicy"
              [(ngModel)]="globalPolicy"
              [disabled]="!policyEditEnabled"
              class="clr-select"
            >
              <option value="Exclude">{{ 'bundle-plugin.policy-exclude' | translate }}</option>
              <option value="Allow">{{ 'bundle-plugin.policy-allow' | translate }}</option>
            </select>
            <div class="help-text mt-2" *ngIf="globalPolicy === 'Exclude'" style="color: #28a745;">
              ✓ <strong>{{ 'bundle-plugin.recommended' | translate }}:</strong> {{ 'bundle-plugin.policy-exclude-help' | translate }}
            </div>
            <div class="help-text mt-2" *ngIf="globalPolicy === 'Allow'" style="color: #ff9800;">
              ⚠ <strong>{{ 'bundle-plugin.warning' | translate }}:</strong> {{ 'bundle-plugin.policy-allow-help' | translate }}
            </div>
          </div>
          
          <div class="clr-col-md-6">
            <label for="maxDiscount" class="clr-control-label">{{ 'bundle-plugin.maximum-discount-cap' | translate }}</label>
            <input 
              type="number" 
              id="maxDiscount"
              [(ngModel)]="maxDiscountPercent"
              [disabled]="!policyEditEnabled"
              min="0"
              max="100"
              step="5"
              class="clr-input"
              style="width: 150px;"
            />
            <div class="help-text mt-2 text-muted small">
              {{ 'bundle-plugin.current-max-discount' | translate:{percent: maxDiscountPercent} }}
            </div>
          </div>
        </div>
        
        <div class="mt-3">
          <label class="clr-control-label">
            <input 
              type="checkbox" 
              clrCheckbox 
              [(ngModel)]="confirmUnderstand"
              [disabled]="!policyEditEnabled"
            />
            {{ 'bundle-plugin.i-understand-critical-config' | translate }}
          </label>
        </div>
        
        <div class="mt-3">
          <button 
            class="btn btn-warning" 
            *ngIf="!policyEditEnabled"
            (click)="enablePolicyEdit()"
          >
            <clr-icon shape="unlock"></clr-icon>
            {{ 'bundle-plugin.enable-editing' | translate }}
          </button>
          
          <button 
            class="btn btn-primary" 
            *ngIf="policyEditEnabled"
            [disabled]="!confirmUnderstand || isLoading"
            (click)="saveGlobalPolicy()"
          >
            <clr-icon shape="floppy" *ngIf="!isLoading"></clr-icon>
            <span *ngIf="isLoading" class="spinner spinner-inline"></span>
            {{ isLoading ? ('bundle-plugin.saving' | translate) : ('bundle-plugin.save-configuration' | translate) }}
          </button>
          
          <button 
            class="btn btn-link" 
            *ngIf="policyEditEnabled"
            [disabled]="isLoading"
            (click)="cancelPolicyEdit()"
          >
            {{ 'bundle-plugin.cancel' | translate }}
          </button>
        </div>
        
        <div *ngIf="policyEditEnabled" class="alert alert-success mt-3">
          <clr-icon shape="check-circle" class="is-success"></clr-icon>
          <strong>{{ 'bundle-plugin.live-configuration' | translate }}</strong>
        </div>
      </vdr-card>
    </vdr-page-block>

    <vdr-page-block>
      <vdr-data-table
        [items]="bundles"
        [itemsPerPage]="itemsPerPage"
        [totalItems]="totalItems"
        [currentPage]="currentPage"
        (pageChange)="setPage($event)"
      >
        <vdr-dt-column>{{ 'bundle-plugin.name' | translate }}</vdr-dt-column>
        <vdr-dt-column>{{ 'bundle-plugin.price' | translate }}</vdr-dt-column>
        <vdr-dt-column>{{ 'bundle-plugin.status' | translate }}</vdr-dt-column>
        <vdr-dt-column>{{ 'bundle-plugin.items' | translate }}</vdr-dt-column>

        <ng-template let-bundle="item">
          <td class="left align-middle">
            <a [routerLink]="['./', bundle.id]" class="button-ghost">
              {{ bundle.name }}
            </a>
          </td>
          <td class="left align-middle">{{ bundle.effectivePrice | currency }}</td>
          <td class="left align-middle">
            <vdr-chip [colorType]="getStatusColor(bundle.status)">
              {{ bundle.status }}
            </vdr-chip>
            <div *ngIf="isExpired(bundle) && bundle.status !== 'EXPIRED'" style="color: #ff9800; font-size: 0.85em; margin-top: 4px;">
              ⚠️ {{ 'bundle-plugin.expired' | translate }}: {{ bundle.validTo | date:'short' }}
            </div>
          </td>
          <td class="left align-middle">{{ bundle.items?.length || 0 }} {{ 'bundle-plugin.items' | translate }}</td>
        </ng-template>
      </vdr-data-table>
    </vdr-page-block>
  `,
})
export class BundleListComponent implements OnInit {
  bundles: any[] = [];
  totalItems = 0;
  itemsPerPage = 10;
  currentPage = 1;
  
  // Global promotion policy settings
  globalPolicy: 'Exclude' | 'Allow' = 'Exclude';
  maxDiscountPercent: number = 50;
  policyEditEnabled: boolean = false;
  confirmUnderstand: boolean = false;
  isLoading: boolean = false;

  constructor(
    private dataService: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadBundles();
    this.loadBundleConfig();
  }

  loadBundles() {
    const query = gql`
      query GetBundles($options: BundleListOptions) {
        bundles(options: $options) {
          items {
            id
            name
            status
            validFrom
            validTo
            effectivePrice
            items {
              id
            }
          }
          totalItems
        }
      }
    `;

    this.dataService
      .query(query, {
        options: {
          skip: (this.currentPage - 1) * this.itemsPerPage,
          take: this.itemsPerPage,
        },
      })
      .single$.subscribe({
        next: (data: any) => {
          this.bundles = data.bundles.items;
          this.totalItems = data.bundles.totalItems;
        },
        error: (err) => {
          this.notificationService.error('Failed to load bundles');
          console.error(err);
        },
      });
  }

  setPage(page: number) {
    this.currentPage = page;
    this.loadBundles();
  }

  createBundle() {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  isExpired(bundle: any): boolean {
    if (!bundle.validTo) {
      return false;
    }
    const now = new Date();
    const validTo = new Date(bundle.validTo);
    return validTo < now;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'EXPIRED':
        return 'error';
      case 'BROKEN':
        return 'error';
      case 'ARCHIVED':
        return 'warning';
      case 'DRAFT':
        return 'warning';
      default:
        return 'warning';
    }
  }

  loadBundleConfig() {
    const query = gql`
      query GetBundleConfig {
        bundleConfig {
          siteWidePromosAffectBundles
          maxCumulativeDiscountPctForBundleChildren
        }
      }
    `;

    this.dataService.query(query).single$.subscribe({
      next: (data: any) => {
        this.globalPolicy = data.bundleConfig.siteWidePromosAffectBundles;
        this.maxDiscountPercent = data.bundleConfig.maxCumulativeDiscountPctForBundleChildren * 100;
      },
      error: (err) => {
        console.error('Failed to load bundle config:', err);
      },
    });
  }

  enablePolicyEdit() {
    this.policyEditEnabled = true;
    this.confirmUnderstand = false;
    this.notificationService.warning(
      'You are about to modify critical system configuration. Proceed with caution.'
    );
  }

  cancelPolicyEdit() {
    this.policyEditEnabled = false;
    this.confirmUnderstand = false;
    this.loadBundleConfig(); // Reset to current database values
  }

  saveGlobalPolicy() {
    if (!this.confirmUnderstand) {
      this.notificationService.error('You must confirm understanding before proceeding.');
      return;
    }

    this.isLoading = true;

    const mutation = gql`
      mutation UpdateBundleConfig($input: UpdateBundleConfigInput!) {
        updateBundleConfig(input: $input) {
          siteWidePromosAffectBundles
          maxCumulativeDiscountPctForBundleChildren
        }
      }
    `;

    this.dataService
      .mutate(mutation, {
        input: {
          siteWidePromosAffectBundles: this.globalPolicy,
          maxCumulativeDiscountPctForBundleChildren: this.maxDiscountPercent / 100,
        },
      })
      .subscribe({
        next: (result: any) => {
          this.isLoading = false;
          this.policyEditEnabled = false;
          this.confirmUnderstand = false;
          this.notificationService.success(
            'Bundle configuration updated successfully. Changes are now active (no restart required).'
          );
          this.loadBundleConfig();
        },
        error: (err) => {
          this.isLoading = false;
          this.notificationService.error('Failed to update bundle configuration');
          console.error(err);
        },
      });
  }
}
