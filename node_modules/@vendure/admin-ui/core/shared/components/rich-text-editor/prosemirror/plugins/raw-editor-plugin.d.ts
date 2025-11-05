import { Plugin } from 'prosemirror-state';
import { ModalService } from '../../../../../providers/modal/modal.service';
import { ContextMenuService } from '../context-menu/context-menu.service';
/**
 * Implements editing of raw HTML for the selected node in the editor.
 */
export declare const rawEditorPlugin: (contextMenuService: ContextMenuService, modalService: ModalService) => Plugin<any>;
