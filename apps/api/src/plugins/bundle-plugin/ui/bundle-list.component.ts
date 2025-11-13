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
            <vdr-chip [colorType]="bundle.status === 'ACTIVE' ? 'success' : 'warning'">
              {{ bundle.status }}
            </vdr-chip>
            <div *ngIf="isExpired(bundle)" style="color: #ff9800; font-size: 0.85em; margin-top: 4px;">
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
}
