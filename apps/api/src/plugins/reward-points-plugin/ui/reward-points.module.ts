import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';

import { RewardPointsSettingsComponent } from './reward-points-settings.component';
import { CustomerPointsManagementComponent } from './customer-points-management.component';

@NgModule({
    imports: [
        SharedModule,
        RouterModule.forChild([
            {
                path: '',
                pathMatch: 'full',
                component: RewardPointsSettingsComponent,
                data: { breadcrumb: 'Reward Points Settings' },
            },
            {
                path: 'settings',
                component: RewardPointsSettingsComponent,
                data: { breadcrumb: 'Settings' },
            },
            {
                path: 'customers',
                component: CustomerPointsManagementComponent,
                data: { breadcrumb: 'Customer Points' },
            },
        ]),
    ],
    declarations: [
        RewardPointsSettingsComponent,
        CustomerPointsManagementComponent,
    ],
    providers: [],
})
export class RewardPointsModule {}