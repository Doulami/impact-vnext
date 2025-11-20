import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BundleNavModule } from './extensions/bundle-ui/bundle-nav.module';
import { RewardPointsNavModule } from './extensions/reward-points-ui/reward-points-nav.module';

import SharedProviders_0_0 from './extensions/443701306db646ff467cbe39b4fc6140fabdfb20f0270b2343c57930dc246003/providers';
import SharedProviders_3_0 from './extensions/nutrition-batch-ui/providers';


@NgModule({
    imports: [CommonModule, BundleNavModule, RewardPointsNavModule],
    providers: [...SharedProviders_0_0, ...SharedProviders_3_0],
})
export class SharedExtensionsModule {}
