import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService, NotificationService } from '@vendure/admin-ui/core';
import gql from 'graphql-tag';

@Component({
  selector: 'bundle-list',
  standalone: false,
  styles: [`
    .bundle-meta {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.25rem;
      font-size: 0.875rem;
    }
    .category-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      background-color: #e8f4f8;
      color: #0066cc;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .text-muted {
      color: #666;
    }
  `],
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
        <vdr-dt-column [heading]="'ID'" [hiddenByDefault]="true">
          <ng-template let-bundle="item">
            {{ bundle.id }}
          </ng-template>
        </vdr-dt-column>
        
        <vdr-dt-column [heading]="'Name'" [expand]="true">
          <ng-template let-bundle="item">
            <a [routerLink]="['./', bundle.id]" class="button-ghost">
              <strong>{{ bundle.name }}</strong>
            </a>
            <div class="bundle-meta">
              <span class="text-muted">{{ bundle.items?.length || 0 }} items</span>
              <span *ngIf="bundle.category" class="category-badge">{{ bundle.category }}</span>
            </div>
          </ng-template>
        </vdr-dt-column>

        <vdr-dt-column [heading]="'Price'">
          <ng-template let-bundle="item">
            <strong>{{ bundle.price | currency }}</strong>
          </ng-template>
        </vdr-dt-column>

        <vdr-dt-column [heading]="'Status'">
          <ng-template let-bundle="item">
            <vdr-chip [colorType]="bundle.enabled ? 'success' : 'warning'">
              {{ bundle.enabled ? 'Enabled' : 'Disabled' }}
            </vdr-chip>
          </ng-template>
        </vdr-dt-column>

        <vdr-dt-column [heading]="'Updated'">
          <ng-template let-bundle="item">
            {{ bundle.updatedAt | date:'short' }}
          </ng-template>
        </vdr-dt-column>
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
            price
            enabled
            category
            updatedAt
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
}
