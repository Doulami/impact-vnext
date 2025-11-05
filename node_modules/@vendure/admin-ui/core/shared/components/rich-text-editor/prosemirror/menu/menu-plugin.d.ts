import { Injector } from '@angular/core';
import { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
export interface CustomMenuPluginOptions {
    floatingMenu?: boolean;
    schema: Schema;
    injector: Injector;
}
export declare function customMenuPlugin(options: CustomMenuPluginOptions): Plugin<any>;
