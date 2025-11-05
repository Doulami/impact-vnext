import { DropdownSubmenu, MenuElement } from 'prosemirror-menu';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
export declare class SubMenuWithIcon extends DropdownSubmenu {
    private icon;
    constructor(content: readonly MenuElement[] | MenuElement, options: {
        label?: string;
        icon: () => HTMLElement;
    });
    render(view: EditorView): {
        dom: HTMLElement;
        update: (state: EditorState) => boolean;
    };
}
