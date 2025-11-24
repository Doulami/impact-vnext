import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BundleNavModule } from './extensions/bundle-ui/bundle-nav.module';
import { RewardPointsNavModule } from './extensions/reward-points-ui/reward-points-nav.module';

import SharedProviders_0_0 from './extensions/5aca06d2259bf71f657ffb168629a5560db2de678dfa2b9848bacaf84c5b2636/providers';
import SharedProviders_1_0 from './extensions/bundle-ui/bundle-variant-tab-providers';
import SharedProviders_2_0 from './extensions/reward-points-ui/providers';
import SharedProviders_3_0 from './extensions/nutrition-batch-ui/providers';


@NgModule({
    imports: [CommonModule, BundleNavModule, RewardPointsNavModule],
    providers: [...SharedProviders_0_0, ...SharedProviders_1_0, ...SharedProviders_2_0, ...SharedProviders_3_0],
})
export class SharedExtensionsModule {}
