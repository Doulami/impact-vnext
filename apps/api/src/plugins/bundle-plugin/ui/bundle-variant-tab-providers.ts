import { registerPageTab } from '@vendure/admin-ui/core';
import { BundleVariantTabComponent } from './bundle-variant-tab.component';
import { BundleVariantDetailComponent } from './bundle-variant-detail.component';

export default [
  registerPageTab({
    location: 'product-variant-detail',
    tab: 'Bundle',
    tabIcon: 'layers',
    route: 'bundle',
    component: BundleVariantTabComponent,
    routeConfig: {
      children: [
        {
          path: ':id',
          component: BundleVariantDetailComponent,
        },
      ],
    },
  }),
];
