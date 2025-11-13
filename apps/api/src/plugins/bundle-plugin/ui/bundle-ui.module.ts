import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';
import { BundleListComponent } from './bundle-list.component';
import { BundleDetailComponent } from './bundle-detail.component';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        pathMatch: 'full',
        component: BundleListComponent,
        data: { breadcrumb: 'Bundles' },
      },
      {
        path: ':id',
        component: BundleDetailComponent,
        data: { breadcrumb: 'Bundle Detail' },
      },
    ]),
  ],
  declarations: [BundleListComponent, BundleDetailComponent],
})
export class BundleUiModule {}
