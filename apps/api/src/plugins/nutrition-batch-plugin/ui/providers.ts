import { registerPageTab } from '@vendure/admin-ui/core';
import { NutritionBatchTabComponent } from './nutrition-batch-tab.component';
import { NutritionBatchDetailComponent } from './nutrition-batch-detail.component';

export default [
  registerPageTab({
    location: 'product-variant-detail',
    tab: 'Batches & Nutrition',
    tabIcon: 'flask',
    route: 'nutrition-batches',
    component: NutritionBatchTabComponent,
    routeConfig: {
      children: [
        {
          path: ':batchId',
          component: NutritionBatchDetailComponent,
        },
      ],
    },
  }),
];
