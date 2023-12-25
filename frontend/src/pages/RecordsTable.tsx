import * as React from "react";
import {useEffect, useMemo, useRef, useState} from "react";
import MUIDataTable, {
    DisplayData,
    MUIDataTableColumn,
    MUIDataTableColumnDef, MUIDataTableColumnOptions,
    MUIDataTableMeta, MUIDataTableProps,
    MUIDataTableState, MUISortOptions
} from "mui-datatables";
import {Country, State, City, ICountry, IState, ICity} from 'country-state-city';
import {
    Checkbox,
    FormControl, FormHelperText, FormLabel,
    IconButton,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
    Stack,
    Tooltip
} from "@mui/material";
import {Simulate} from "react-dom/test-utils";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import {getQParam, setQParam} from "../hooks";
import {tab} from "@testing-library/user-event/dist/tab";

/**
 * Predefine filter from URL
 * @param columns
 */
function set_filter_from_url(columns: MUIDataTableColumn[]): MUIDataTableColumn[] {
    for (let column of columns.filter(x => x.options)) {
        let name = 'f_' + column.name;
        let value = getQParam(name)?.split(',')?.map(x => x?.trim()) || [];
        // @ts-ignore
        // doesn't see the condition above
        column.options.filterList = [...value];
    }

    return columns;
}

const q_sort_name = 's_record';

/**
 * Creates sort description from URL
 */
function get_sort_from_url(): MUISortOptions {
    const [name, direction] = getQParam(q_sort_name)?.split('+') || [];
    // @ts-ignore
    return name ? {name, direction} : {};
}

/**
 * Saving filter data to
 * @param tableState
 */
function set_to_url(tableState: MUIDataTableState) {
    for (let i = 0; i < tableState.filterList.length; i++) {
        const col_index = tableState.columnOrder[i];
        const column_def = tableState.columns[col_index];
        const name = 'f_' + column_def.name;
        const data = tableState.filterList[i].join(',');
        setQParam(name, data);
    }

    const sort_values = 'desc asc'.split(' ')
    if (sort_values.includes(tableState.sortOrder.direction))
        setQParam(q_sort_name, tableState.sortOrder.name + '+' + tableState.sortOrder.direction);
    else
        setQParam(q_sort_name, '');
}

function date_render(value: any, tableMeta: MUIDataTableMeta, updateValue: (value: string) => void): string | React.ReactNode {
    return new Date(value).toLocaleDateString('en-us', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hourCycle: 'h24',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });
}

// type dependant_filters = { country: string[], state: string[], city: string[] };

// function get_available_filters_fn(tableState: MUIDataTableState) {
//     return function (): dependant_filters {
//         const result: dependant_filters = {
//             country: [],
//             state: [],
//             city: [],
//         };
//
//         let fields = 'country state city'.split(' ');
//
//         // @ts-ignore
//         let [countries, states, cities]: [ICountry[], IState[], ICity[]] = fields
//             .map(x => tableState.data.map(d => d[x]).filter(Boolean));
//
//         const [selected_country_names, selected_state_names, selected_city_names] = fields.map(x => tableState
//             .filterList[tableState.columnOrder[tableState.columns.findIndex(c => c.name == x)]]);
//
//         if (selected_country_names.length)
//             countries = countries.filter(x=>selected_country_names.includes(x.name));
//         if (selected_state_names.length)
//             states = states.filter(x=>selected_state_names.includes(x.name));
//         if (selected_city_names.length)
//             cities = cities.filter(x=>selected_city_names.includes(x.name));
//
//         return result;
//     };
// }

export const RecordsPage = () => {
    const [data, setData] = useState<any[]>([]);
    const tableStateRef = useRef<MUIDataTableState>();

    function on_table_state_changed(action: string, tableState: MUIDataTableState): void {
        tableStateRef.current = tableState;
        set_to_url(tableState);
    }

    const columns: MUIDataTableColumnDef[] = useMemo(() => {

        function dropdown_logic(location: string, filters: any[], row?: any[]): boolean {
            return !!filters.length && !filters.includes(location);
        }

        function get_dependant_filters(): { country: string[], state: string[], city: string[] } {
            const result: { country: string[], state: string[], city: string[] } = {
                country: [],
                state: [],
                city: [],
            };
            const state = tableStateRef.current;
            if (!!state) {
                const [country_index, state_index, city_index] = 'country state city'.split(' ')
                    .map(x => state.columnOrder[state.columns.findIndex(c => c.name == x)]);

                if (country_index >= 0)
                    result.country = state.filterData[country_index];
                if (state_index >= 0)
                    result.state = state.filterData[state_index];
                if (city_index >= 0)
                    result.city = state.filterData[city_index];

                if (result.country?.length) {
                    const available_states = new Set(result.country.flatMap(x => State.getStatesOfCountry(x))
                        .map(x => x.isoCode));
                    result.state = result.state?.filter(x => available_states.has(x));

                    const available_cities = new Set(result.country.flatMap(x => City.getCitiesOfCountry(x))
                        .map(x => x?.name).filter(Boolean));
                    result.city = result.city?.filter(x => available_cities.has(x));
                }

                if (result.state?.length) {
                    // @ts-ignore
                    const states: IState[] = result.state.map(x => State.getStateByCode(x)).filter(Boolean);
                    const possible_countries = new Set(states.map(x => x?.isoCode));
                    const possible_cities = new Set(states.flatMap(x => City.getCitiesOfState(x.countryCode, x.isoCode)
                        ?.flatMap(c => c.name)));

                    result.country = result.country.filter(x => possible_countries.has(x));
                    result.city = result.city.filter(x => possible_cities.has(x));
                }

                if (result.city.length) {
                    // @ts-ignore
                    const possible_cities: ICity[] = data.flatMap(({country, state, city}) => {
                        const all_cities = City.getCitiesOfState(country, state);
                        return all_cities.find(x => x.name == city);
                    });
                }
            }
            return result;
        }

        function create_dd_filter(filter_data?: () => string[], deps?: string[]) {
            return function dd_filter(filterList: MUIDataTableState["filterList"],
                                      onChange: (val: string | string[], index: number, column: MUIDataTableColumn) => void,
                                      index: number,
                                      column: MUIDataTableColumn,
                                      filterData: MUIDataTableState["filterData"]) {
                let all_values = filterData[index];
                // let visible_values: string[] = Array.from(new Set(tableStateRef?.current?.displayData.map(x => x.data[index])));
                let custom_values = filter_data?.() || [];
                let optionValues = all_values.map(x => ({
                    item: x,
                    enabled: !custom_values.length || custom_values.includes(x),
                }));
                return (
                    <FormControl>
                        <InputLabel id='select-multiple-chip'>{column.label}</InputLabel>
                        <Select
                            labelId="select-multiple-chip"
                            label={column.label}
                            multiple
                            value={filterList[index]}
                            renderValue={selected => selected.join(', ')}
                            onChange={event => {
                                filterList[index] = Array.isArray(event.target.value) ? event.target.value : [event.target.value];
                                onChange(filterList[index], index, column);

                                // request to update all filters
                                window.requestAnimationFrame(time => {
                                    tableStateRef.current?.columns?.forEach((value, col_index) => {
                                        if (value.filterType == 'custom' && value.name != column.name && deps?.includes(value.name)) {
                                            onChange(filterList[col_index], col_index, value);
                                        }
                                    });
                                });
                                setQParam('f_' + column.name, filterList[index].join(','));
                            }}>
                            {optionValues.map(({item, enabled}) => (
                                <MenuItem key={item} value={item}>
                                    <Checkbox
                                        disabled={!enabled}
                                        color='primary'
                                        checked={filterList[index].indexOf(item) > -1}
                                    />
                                    <FormLabel disabled={!enabled}>{item}</FormLabel>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );
            }
        }

        /**
         * Created default column description
         * @param name column field name
         * @param opts columns options
         * @param label column header label
         */
        function default_column(name: string, opts: MUIDataTableColumnOptions, label?: string): MUIDataTableColumn {
            return {
                name,
                label: label || name.substring(0, 1).toUpperCase() + name.substring(1),
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    ...opts,
                }
            };
        }

        const result: MUIDataTableColumn[] = 'name phone email'.split(' ')
            .map(x => {
                return default_column(x, {
                    filterType: 'custom',
                    filterOptions: {
                        logic: dropdown_logic,
                        display: create_dd_filter(),
                    },
                });
            });
        const dependant_filters = 'country state city'.split(' ');

        for (let name of dependant_filters) {
            result.push(default_column(name, {
                filterType: 'custom',
                customBodyRender: value => value?.name,
                filterOptions: {
                    logic: dropdown_logic,
                    display: create_dd_filter(),
                },
            }));
        }
        for (let [name, label] of [['created', 'Created date'], ['updated', 'Updated date']]) {
            result.push(default_column(name, {customBodyRender: date_render}, label));
        }
        set_filter_from_url(result);
        return result;
    }, [data, tableStateRef.current]);

    // debug loading items
    useEffect(() => {
        const result = [];
        const rand_name = () => {
            const name = Math.floor(Math.random() * 1_000_000).toString()
                .replace(/0/g, 'a')
                .replace(/1/g, 'b')
                .replace(/2/g, 'c')
                .replace(/3/g, 'd')
                .replace(/4/g, 'e')
                .replace(/5/g, 'f')
                .replace(/6/g, 'j')
                .replace(/7/g, 'h')
                .replace(/8/g, 'i')
                .replace(/9/g, 'j');
            return name;
        }
        const r_date = () => new Date(new Date().valueOf() - Math.random() * Math.pow(10, 12));

        function rand_elem<T>(arr: T[]): T {
            let index = new Date().valueOf() % arr.length;
            index = Math.max(0, index);
            index = Math.min(arr.length, index);
            // @ts-ignore
            return arr[index] || {name: 'DEFAULT'};
        }

        for (let i = 0; i < 25; i++) {
            const country = Country.getCountryByCode('US');
            const state = rand_elem(State.getStatesOfCountry(country?.isoCode));
            const city = rand_elem(City.getCitiesOfState(country?.isoCode || '', state.isoCode));
            const item = {
                name: rand_name(),
                email: rand_name() + '@mail.com',
                phone: '+' + Math.floor(Math.random() * 1_00_000_000_000),
                country: country,
                state: state,
                city: city,
                created: r_date(),
                updated: r_date(),
            };
            result.push(item);
        }
        setData(result);
    }, []);

    return <MUIDataTable columns={columns}
                         data={data}
                         title='Records'
                         options={{
                             print: false,
                             download: false,
                             onTableChange: on_table_state_changed,
                             sortOrder: get_sort_from_url(),
                         }}
    />
};