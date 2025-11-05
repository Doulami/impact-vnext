import { NgOption, SelectionModel } from '@ng-select/ng-select';
/**
 * A custom SelectionModel for the NgSelect component which only allows a single
 * search term at a time.
 */
export declare class SingleSearchSelectionModel implements SelectionModel {
    private _selected;
    get value(): NgOption[];
    select(item: NgOption, multiple: boolean, groupAsModel: boolean): void;
    unselect(item: NgOption, multiple: boolean): void;
    clear(keepDisabled: boolean): void;
    private _setChildrenSelectedState;
    private _removeChildren;
    private _removeParent;
}
export declare function SingleSearchSelectionModelFactory(): SingleSearchSelectionModel;
