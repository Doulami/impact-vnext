import { registerCustomDetailComponent } from '@vendure/admin-ui/core';
import { ProductBundleInfoComponent } from './components/product-bundle-info/product-bundle-info.component';

/**
 * Register custom UI components for the Bundle plugin.
 * 
 * This registers the ProductBundleInfoComponent on the Product detail page,
 * which displays a warning and link to the bundle editor for bundle-managed products.
 */
export default [
    registerCustomDetailComponent({
        locationId: 'product-detail',
        component: ProductBundleInfoComponent,
    }),
];
