import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import SharedProviders_0_0 from './extensions/5aca06d2259bf71f657ffb168629a5560db2de678dfa2b9848bacaf84c5b2636/providers';
import SharedProviders_1_0 from './extensions/nutrition-batch-ui/providers';


@NgModule({
    imports: [CommonModule, ],
    providers: [...SharedProviders_0_0, ...SharedProviders_1_0],
})
export class SharedExtensionsModule {}
