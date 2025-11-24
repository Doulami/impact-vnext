import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, SharedModule, NotificationService } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';

const GET_PRODUCT = gql`
  query GetProduct($id: ID!) {
    product(id: $id) {
      id
      name
      customFields {
        isBundle
        bundleId
      }
    }
  }
`;

const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      id
      name
      customFields {
        isBundle
        bundleId
      }
    }
  }
`;

@Component({
  selector: 'bundle-variant-tab',
  standalone: true,
  imports: [SharedModule, RouterModule],
  template: `
    <router-outlet></router-outlet>
    <div class="bundle-variant-tab" *ngIf="!hasChildRoute">
      <div *ngIf="loading" class="bundle-loading">
        <clr-spinner>Loading...</clr-spinner>
      </div>

      <div *ngIf="!loading && !productId" class="bundle-not-configured">
        <vdr-alert type="warning">
          <h3>Product Not Saved</h3>
          <p>Please save this product before configuring bundle settings.</p>
        </vdr-alert>
      </div>

      <div *ngIf="!loading && productId && !isBundle" class="bundle-not-configured">
        <vdr-alert type="info">
          <h3>This product is not configured as a bundle</h3>
          <p>Activate bundle management for this product to create and configure bundle pricing.</p>
          <button 
            class="btn btn-primary" 
            (click)="activateBundle()" 
            [disabled]="activating"
            style="margin-top: 12px;">
            <clr-icon shape="check" *ngIf="!activating"></clr-icon>
            <clr-spinner *ngIf="activating" clrInline></clr-spinner>
            {{ activating ? 'Activating...' : 'Activate Bundle for this Product' }}
          </button>
        </vdr-alert>
      </div>
    </div>
  `,
  styles: [`
    .bundle-variant-tab {
      padding: 20px;
    }
    .bundle-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
    }
    .bundle-not-configured {
      max-width: 600px;
      margin: 40px auto;
    }
  `]
})
export class BundleVariantTabComponent implements OnInit {
  productId!: string;
  productName!: string;
  isBundle = false;
  bundleId?: string;
  loading = true;
  hasChildRoute = false;
  activating = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
    private notificationService: NotificationService,
    private changeDetector: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.productId = this.route.parent?.snapshot.params['id'];
    
    if (!this.productId || this.productId === 'create') {
      console.error('BundleVariantTab: Product not saved yet');
      this.loading = false;
      this.isBundle = false;
      return;
    }

    // Check for child routes
    this.router.events.subscribe(() => {
      const url = this.router.url;
      const onListView = url.endsWith('/bundle') || url.includes('/bundle?');
      this.hasChildRoute = !onListView;
      this.changeDetector.markForCheck();
    });
    
    // Initial check
    const url = this.router.url;
    const onListView = url.endsWith('/bundle') || url.includes('/bundle?');
    this.hasChildRoute = !onListView;
    
    this.loadProductContext();
  }

  private loadProductContext() {
    this.dataService.query(GET_PRODUCT, { id: this.productId })
      .mapStream((data: any) => data.product)
      .subscribe({
        next: (product) => {
          if (product) {
            this.productName = product.name;
            this.isBundle = product.customFields?.isBundle || false;
            this.bundleId = product.customFields?.bundleId;
            
            // Auto-navigate to bundle form
            const url = this.router.url;
            const onTabRoot = url.endsWith('/bundle') || url.includes('/bundle?');
            if (onTabRoot && this.isBundle) {
              if (this.bundleId) {
                this.router.navigate([this.bundleId], { relativeTo: this.route });
              } else {
                this.router.navigate(['create'], { relativeTo: this.route, queryParams: { productName: this.productName } });
              }
            }
          }
          this.loading = false;
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          console.error('Error loading product context:', error);
          this.loading = false;
          this.changeDetector.markForCheck();
        }
      });
  }

  activateBundle() {
    if (this.activating || !this.productId) return;
    
    this.activating = true;
    this.changeDetector.markForCheck();
    
    this.dataService.mutate(UPDATE_PRODUCT, {
      input: {
        id: this.productId,
        customFields: {
          isBundle: true
        }
      }
    }).subscribe({
      next: (result: any) => {
        this.notificationService.success('Bundle activated successfully');
        this.isBundle = true;
        this.activating = false;
        this.changeDetector.markForCheck();
        
        // Navigate to bundle creation form
        this.router.navigate(['create'], { relativeTo: this.route, queryParams: { productName: this.productName } });
      },
      error: (error) => {
        console.error('Error activating bundle:', error);
        this.notificationService.error('Failed to activate bundle: ' + (error.message || 'Unknown error'));
        this.activating = false;
        this.changeDetector.markForCheck();
      }
    });
  }
}
