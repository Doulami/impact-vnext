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
          <vdr-page-title [title]="'Bundles'" icon="layers"></vdr-page-title>
        </vdr-ab-left>
        <vdr-ab-right>
          <button class="btn btn-primary" (click)="createBundle()">
            <clr-icon shape="plus"></clr-icon>
            Create Bundle
          </button>
        </vdr-ab-right>
      </vdr-action-bar>
    </vdr-page-block>

    <!-- Global Promotion Policy Settings -->
    <vdr-page-block>
      <vdr-card>
        <h3 class="mb-3">Global Promotion Policy</h3>
        <div class="alert alert-warning mb-3">
          <clr-icon shape="exclamation-triangle" class="is-warning"></clr-icon>
          <strong>Warning:</strong> This is a critical system configuration that affects ALL bundles and promotions.
          Changes require manual editing of <code>vendure-config.ts</code> and server restart to take effect.
        </div>
        
        <div class="clr-row">
          <div class="clr-col-md-6">
            <label for="globalPolicy" class="clr-control-label">Site-wide Promotion Policy</label>
            <select 
              clrSelect
              id="globalPolicy"
              [(ngModel)]="globalPolicy"
              [disabled]="!policyEditEnabled"
              class="clr-select"
            >
              <option value="Exclude">Exclude (Safe - Prevents double-discounting)</option>
              <option value="Allow">Allow (Risky - May cause double-discounting)</option>
            </select>
            <div class="help-text mt-2" *ngIf="globalPolicy === 'Exclude'" style="color: #28a745;">
              ✓ <strong>Recommended:</strong> External promotions will NOT apply to bundles by default.
            </div>
            <div class="help-text mt-2" *ngIf="globalPolicy === 'Allow'" style="color: #ff9800;">
              ⚠ <strong>Warning:</strong> May cause double-discounting. Use per-bundle controls to prevent issues.
            </div>
          </div>
          
          <div class="clr-col-md-6">
            <label for="maxDiscount" class="clr-control-label">Maximum Discount Cap (%)</label>
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
              Current: <strong>{{maxDiscountPercent}}%</strong> maximum combined discount
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
            I understand this is a critical configuration that requires manual code changes to persist
          </label>
        </div>
        
        <div class="mt-3">
          <button 
            class="btn btn-warning" 
            *ngIf="!policyEditEnabled"
            (click)="enablePolicyEdit()"
          >
            <clr-icon shape="unlock"></clr-icon>
            Enable Editing
          </button>
          
          <button 
            class="btn btn-primary" 
            *ngIf="policyEditEnabled"
            [disabled]="!confirmUnderstand"
            (click)="saveGlobalPolicy()"
          >
            <clr-icon shape="floppy"></clr-icon>
            Generate Configuration Instructions
          </button>
          
          <button 
            class="btn btn-link" 
            *ngIf="policyEditEnabled"
            (click)="cancelPolicyEdit()"
          >
            Cancel
          </button>
        </div>
        
        <div *ngIf="configInstructions" class="alert alert-info mt-3">
          <h4>Configuration Instructions:</h4>
          <p>Edit <code>apps/api/src/vendure-config.ts</code> and update the BundlePlugin.init() configuration:</p>
          <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">BundlePlugin.init({{
  siteWidePromosAffectBundles: '{{globalPolicy}}',
  maxCumulativeDiscountPctForBundleChildren: {{maxDiscountPercent / 100}},
  guardMode: 'strict',
  logPromotionGuardDecisions: IS_DEV
}})</pre>
          <p class="mt-2"><strong>Important:</strong> Restart the server after making these changes.</p>
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
        <vdr-dt-column>Name</vdr-dt-column>
        <vdr-dt-column>Price</vdr-dt-column>
        <vdr-dt-column>Status</vdr-dt-column>
        <vdr-dt-column>Items</vdr-dt-column>

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
              ⚠️ Expired: {{ bundle.validTo | date:'short' }}
            </div>
          </td>
          <td class="left align-middle">{{ bundle.items?.length || 0 }} items</td>
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
  configInstructions: boolean = false;

  constructor(
    private dataService: DataService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadBundles();
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

  enablePolicyEdit() {
    this.policyEditEnabled = true;
    this.confirmUnderstand = false;
    this.configInstructions = false;
    this.notificationService.warning(
      'You are about to modify critical system configuration. Proceed with caution.'
    );
  }

  cancelPolicyEdit() {
    this.policyEditEnabled = false;
    this.confirmUnderstand = false;
    this.configInstructions = false;
    // Reset to current config values
    this.globalPolicy = 'Exclude';
    this.maxDiscountPercent = 50;
  }

  saveGlobalPolicy() {
    if (!this.confirmUnderstand) {
      this.notificationService.error('You must confirm understanding before proceeding.');
      return;
    }

    this.configInstructions = true;
    this.notificationService.success(
      'Configuration instructions generated. Follow the steps below to update your vendure-config.ts file.'
    );
  }
}
