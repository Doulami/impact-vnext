import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, SharedModule } from '@vendure/admin-ui/core';
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
          <p>To manage bundles, first mark this product as a bundle in the product settings.</p>
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dataService: DataService,
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
}
