import {MUIDataTableColumn, MUIDataTableColumnDef, MUIDataTableState, MUISortOptions} from "mui-datatables";
import {getQParam, setQParam} from "./hooks";
import {Dispatch, SetStateAction, useState} from "react";

const q_sort_name = 's_record';
const q_sel_name = 'sel';

export class Table_url_state_manager {
    private _ref: React.MutableRefObject<MUIDataTableState | undefined>;
    private _data: React.MutableRefObject<any[] | undefined>;
    private mark_dirty: () => void;

    /**
     * @param ref - table state reference
     * @param data - data items reference
     * @param mark_dirty - re-render function, for example, simle iterator based on useState
     */
    constructor(ref: React.MutableRefObject<MUIDataTableState | undefined>, data: React.MutableRefObject<any[] | undefined>, mark_dirty: () => void) {
        this._ref = ref;
        this._data = data;
        this.mark_dirty = mark_dirty;
    }

    /**
     * Table sort according URL search params
     */
    get sort(): MUISortOptions {
        const [name, direction] = getQParam(q_sort_name)?.split('+') || [];
        // @ts-ignore
        return name ? {name, direction} : {};
    }

    /**
     * Table state => URL transaction
     * @param sorting - table sorting
     */
    set sort(sorting: MUISortOptions) {
        let value = '';
        if (['asc', 'desc'].includes(sorting.direction))
            value = sorting.name + '+' + sorting.direction;
        setQParam(q_sort_name, value);
    }

    /**
     * Returns filters for exact column
     * @param name column ID, must be unique
     */
    get_col_filter(name: string): string[] {
        const q_name = 'f_' + name;
        let value = getQParam(q_name)?.split(',')?.map(x => x?.trim()) || [];
        return value;
    }

    /**
     * All table filters (used as hook dependencies)
     */
    get table_filters(): string[][] | undefined {
        return this._ref.current?.filterList;
    }

    /**
     * Table fitlers => URL transaction
     */
    save_filter_to_url() {
        const table_state = this._ref?.current;
        if (table_state) {
            for (let i = 0; i < table_state.filterList.length; i++) {
                const col_index = table_state.columnOrder[i];
                const column_def = table_state.columns[col_index];
                const name = 'f_' + column_def.name;
                const data = table_state.filterList[i].join(',');
                setQParam(name, data);
            }
        }
    }

    /**
     * Returns actual table selection according to URL
     */
    get selection(): number[] {
        const data = this._data.current;
        if (!data?.length)
            return [];

        const emails = (getQParam(q_sel_name) || '')?.split(',');
        const indexes: number[] = [];
        emails?.forEach(email => {
            const index = data.findIndex(x => x.email == email);
            if (index >= 0)
                indexes.push(index);
        });
        return indexes;
    }

    /**
     * Table selection => URL tranaction
     * @param selection - table selection
     */
    set selection(selection: number[]) {
        let value = '';
        const data = this._data.current;
        if (data?.length)
            value = selection.map(i => data[i]?.email).filter(Boolean).join(',')
        setQParam(q_sel_name, value);
        this.mark_dirty();
    }

    /**
     * Updating table state according to table changes
     * @param state - table state
     */
    update_state(state: MUIDataTableState): void {
        this._ref.current = state;
    }

    /**
     * Table rows data
     */
    get data(): any[] | undefined {
        return this._data.current;
    }

    /**
     * Sets table data
     * @param data - new table data
     */
    set data(data: any[] | undefined) {
        this._data.current = data;
    }
}