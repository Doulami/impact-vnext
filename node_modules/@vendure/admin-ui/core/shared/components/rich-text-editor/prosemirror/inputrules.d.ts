import { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
export declare function blockQuoteRule(nodeType: any): import("prosemirror-inputrules").InputRule;
export declare function orderedListRule(nodeType: any): import("prosemirror-inputrules").InputRule;
export declare function bulletListRule(nodeType: any): import("prosemirror-inputrules").InputRule;
export declare function codeBlockRule(nodeType: any): import("prosemirror-inputrules").InputRule;
export declare function headingRule(nodeType: any, maxLevel: any): import("prosemirror-inputrules").InputRule;
export declare function buildInputRules(schema: Schema): Plugin;
