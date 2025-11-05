import { Observable } from 'rxjs';
export interface SelectionManagerOptions<T> {
    multiSelect: boolean;
    itemsAreEqual: (a: T, b: T) => boolean;
    additiveMode: boolean;
}
/**
 * @description
 * A helper class used to manage selection of list items. Supports multiple selection via
 * cmd/ctrl/shift key.
 */
export declare class SelectionManager<T> {
    private options;
    constructor(options: SelectionManagerOptions<T>);
    get selection(): T[];
    selectionChanges$: Observable<T[]>;
    private _selection;
    private items;
    private selectionChangesSubject;
    setMultiSelect(isMultiSelect: boolean): void;
    setCurrentItems(items: T[]): void;
    toggleSelection(item: T, event?: MouseEvent): void;
    selectMultiple(items: T[]): void;
    clearSelection(): void;
    isSelected(item: T): boolean;
    areAllCurrentItemsSelected(): boolean;
    toggleSelectAll(): void;
    lastSelected(): T;
    private invokeOnSelectionChangeHandler;
}
