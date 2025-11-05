import { MenuElement } from 'prosemirror-menu';
import { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import { ContextMenuService } from '../context-menu/context-menu.service';
export declare const tableContextMenuPlugin: (contextMenuService: ContextMenuService) => Plugin<any>;
export declare function getTableNodes(): import("prosemirror-tables").TableNodes;
export declare function getTableMenu(schema: Schema): MenuElement[];
export declare function addTable(state: any, dispatch: any, { rowsCount, colsCount, withHeaderRow, cellContent }: {
    rowsCount: any;
    colsCount: any;
    withHeaderRow: any;
    cellContent: any;
}): void;
