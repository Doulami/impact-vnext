import { registerPageTab } from '@vendure/admin-ui/core';
import { CustomerPointsTabComponent } from './customer-points-tab.component';

/**
 * Reward Points UI Providers
 * 
 * Injects reward points functionality into existing Vendure Admin UI pages:
 * 1. Customer Detail page - Points Management tab
 * 
 * Following the same pattern as Batches & Nutrition plugin integration
 */
export default [
  // Customer Detail Page - Points Management Tab
  registerPageTab({
    location: 'customer-detail',
    tab: 'Points',
    tabIcon: 'star',
    route: 'customer-points',
    component: CustomerPointsTabComponent,
  }),
];
