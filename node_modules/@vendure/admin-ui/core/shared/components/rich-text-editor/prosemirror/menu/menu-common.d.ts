import { NodeType } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
export declare function markActive(state: any, type: any): any;
export declare function canInsert(state: EditorState, nodeType: NodeType): boolean;
export interface ClarityIconOptions {
    shape: string;
    size?: number;
    label?: string;
}
export declare function renderClarityIcon(options: ClarityIconOptions): (view: EditorView) => HTMLElement;
export declare function wrapInMenuItemWithIcon(...elements: Array<HTMLElement | undefined | null>): HTMLSpanElement;
export declare const IconSize: {
    Large: number;
    Small: number;
};
