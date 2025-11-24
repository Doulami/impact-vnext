import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule, addNavMenuSection } from '@vendure/admin-ui/core';
import { CustomerPointsTabComponent } from './customer-points-tab.component';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([])],
  declarations: [
    CustomerPointsTabComponent,
  ],
  providers: [
    addNavMenuSection(
      {
        id: 'reward-points',
        label: 'Reward Points',
        items: [
          {
            id: 'reward-points-settings',
            label: 'Settings',
            icon: 'cog',
            routerLink: ['/extensions/reward-points'],
          },
          {
            id: 'reward-points-customers',
            label: 'Customer Points',
            icon: 'users',
            routerLink: ['/extensions/reward-points/customers'],
          },
        ],
      },
      'marketing' // Add to Marketing section
    ),
  ],
})
export class RewardPointsNavModule {}