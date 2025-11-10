import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule, addNavMenuItem } from '@vendure/admin-ui/core';

@NgModule({
  imports: [SharedModule, RouterModule.forChild([])],
  providers: [
    addNavMenuItem(
      {
        id: 'bundles',
        label: 'Bundles',
        routerLink: ['/extensions', 'bundles'],
        icon: 'layers',
        requiresPermission: 'CreateCatalog',
      },
      'catalog'
    ),
  ],
})
export class BundleNavModule {}
