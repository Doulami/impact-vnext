export const extensionRoutes = [  {
    path: 'extensions/bundles',
    loadChildren: () => import('./extensions/bundle-ui/bundle-ui.module').then(m => m.BundleUiModule),
  },
  {
    path: 'extensions/reward-points',
    loadChildren: () => import('./extensions/reward-points-ui/reward-points.module').then(m => m.RewardPointsModule),
  }];
