import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CustomDetailComponent, SharedModule } from '@vendure/admin-ui/core';

/**
 * Custom detail component that displays a warning card on Product detail pages
 * for products that are managed as bundle shells.
 * 
 * This component:
 * - Detects if the product is a bundle shell (customFields.isBundle)
 * - Shows a warning that bundle fields are managed by the Bundle plugin
 * - Provides a direct link to the Bundle editor
 */
@Component({
    standalone: true,
    imports: [SharedModule],
    template: `
        <vdr-card *ngIf="isBundleProduct$ | async" title="Bundle Information">
            <div class="bundle-info-content">
                <p class="text-warning">
                    <clr-icon shape="exclamation-triangle" class="is-warning"></clr-icon>
                    This product is controlled by the Bundle engine.
                    Bundle-related fields are automatically managed and should not be edited directly.
                </p>

                <p>
                    To manage bundle components, pricing, and rules, use the Bundle editor:
                </p>

                <a
                    *ngIf="bundleId$ | async as bundleId"
                    class="button primary"
                    [routerLink]="['/extensions/bundles', bundleId]"
                >
                    <clr-icon shape="bundle"></clr-icon>
                    Open Bundle Configuration
                </a>
            </div>
        </vdr-card>
    `,
    styles: [`
        .bundle-info-content {
            padding: 1rem 0;
        }
        
        .text-warning {
            color: var(--color-warning-600);
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        
        .bundle-info-content p:last-of-type {
            margin-bottom: 1rem;
        }
        
        .button {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
        }
    `]
})
export class ProductBundleInfoComponent implements CustomDetailComponent, OnInit {
    entity$: Observable<any>;
    
    isBundleProduct$: Observable<boolean>;
    bundleId$: Observable<string | null>;

    ngOnInit() {
        // Check if the product has isBundle custom field set to true
        this.isBundleProduct$ = this.entity$.pipe(
            map(entity => entity?.customFields?.isBundle === true)
        );
        
        // Extract the bundleId from custom fields
        this.bundleId$ = this.entity$.pipe(
            map(entity => entity?.customFields?.bundleId || null)
        );
    }
}
