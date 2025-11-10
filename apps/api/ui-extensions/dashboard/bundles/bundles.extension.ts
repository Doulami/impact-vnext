import { defineDashboardExtension } from '@vendure/dashboard/react';
import { BundlesPage } from './BundlesPage';

export default defineDashboardExtension({
    id: 'bundles',
    routes: [
        {
            path: '/bundles',
            component: BundlesPage,
            breadcrumb: 'Bundle Management',
        },
    ],
    navigation: [
        {
            section: 'catalog',
            label: 'Bundles',
            icon: 'layers',
            routerLink: '/bundles',
            requiresPermission: 'CreateCatalog',
        },
    ],
});