import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, SharedModule } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';

const GET_VARIANT_WITH_PRODUCT = gql`
  query GetVariantWithProduct($id: ID!) {
    productVariant(id: $id) {
      id
      product {
        id
        customFields {
          isBundle
          bundleId
        }
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

      <div *ngIf="!loading && !isBundle" class="bundle-not-configured">
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
  variantId!: string;
  productId!: string;
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
    this.variantId = this.route.parent?.snapshot.params['id'];
    
    if (!this.variantId) {
      console.error('BundleVariantTab: No variantId found in route');
      this.loading = false;
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
    this.dataService.query(GET_VARIANT_WITH_PRODUCT, { id: this.variantId })
      .mapStream((data: any) => data.productVariant)
      .subscribe({
        next: (variant) => {
          if (variant) {
            this.productId = variant.product.id;
            this.isBundle = variant.product.customFields?.isBundle || false;
            this.bundleId = variant.product.customFields?.bundleId;
            
            // Auto-navigate to bundle form
            const url = this.router.url;
            const onTabRoot = url.endsWith('/bundle') || url.includes('/bundle?');
            if (onTabRoot && this.isBundle) {
              if (this.bundleId) {
                this.router.navigate([this.bundleId], { relativeTo: this.route });
              } else {
                this.router.navigate(['create'], { relativeTo: this.route, queryParams: { productId: this.productId } });
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
