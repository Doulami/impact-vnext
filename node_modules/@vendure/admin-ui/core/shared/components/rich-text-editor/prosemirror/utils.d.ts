import { MarkType, ResolvedPos } from 'prosemirror-model';
/**
 * Retrieve the start and end position of a mark
 * "Borrowed" from [tiptap](https://github.com/scrumpy/tiptap)
 */
export declare const getMarkRange: (pmPosition?: ResolvedPos | null, type?: MarkType | null | undefined) => {
    from: number;
    to: number;
} | false;
