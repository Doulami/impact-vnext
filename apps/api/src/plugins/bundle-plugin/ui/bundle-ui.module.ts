import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '@vendure/admin-ui/core';
import { BundleListComponent } from './bundle-list.component';

@NgModule({
  imports: [
    SharedModule,
    RouterModule.forChild([
      {
        path: '',
        pathMatch: 'full',
        component: BundleListComponent,
        data: {
          breadcrumb: 'Bundles',
        },
      },
    ]),
  ],
  declarations: [BundleListComponent],
})
export class BundleUiModule {}
