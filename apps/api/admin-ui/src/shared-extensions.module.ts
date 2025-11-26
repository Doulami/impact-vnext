import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import SharedProviders_0_0 from './extensions/443701306db646ff467cbe39b4fc6140fabdfb20f0270b2343c57930dc246003/providers';
import SharedProviders_1_0 from './extensions/nutrition-batch-ui/providers';


@NgModule({
    imports: [CommonModule, ],
    providers: [...SharedProviders_0_0, ...SharedProviders_1_0],
})
export class SharedExtensionsModule {}
