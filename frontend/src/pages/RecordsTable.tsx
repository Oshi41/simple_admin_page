import * as React from "react";
import {useEffect, useMemo, useRef, useState} from "react";
import MUIDataTable, {
    MUIDataTableColumn,
    MUIDataTableColumnDef,
    MUIDataTableColumnOptions,
    MUIDataTableMeta,
    MUIDataTableState,
    MUISortOptions
} from "mui-datatables";
import {City, Country, State,} from 'country-state-city';
import {Checkbox, FormControl, FormLabel, IconButton, InputLabel, MenuItem, Select, Stack} from "@mui/material";
import {Delete, Edit} from '@mui/icons-material';
import {getQParam, setQParam, useLocation} from "../hooks";
import {RecordType} from "../schema";
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber'

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
 * @param data
 */
function set_to_url(tableState: MUIDataTableState, data: any[]) {
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

    const selected = tableState.selectedRows.data.map(x => (x as any)?.index)
        .filter(x => Number.isInteger(x)).map(x=>data[x]?.email).filter(Boolean);
    setQParam('sel', selected.join(','));
}

function get_selection_from_url(data: any[]): number[] {
    const emails = (getQParam('sel') || '').split(' ');
    const result: number[] = [];
    for (let email of emails) {
        const index = data.findIndex(x => x.email == email);
        if (index >= 0)
            result.push(index);
    }
    return result;
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

type RecordsPageProps = {
    set_edit: (obj: RecordType | undefined | Partial<RecordType>) => void,
};

function generate_random_data(): RecordType[] {
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
        let index = Math.floor(Math.random() * arr.length);
        return arr[index];
    }

    const result: RecordType[] = [];
    for (let i = 0; i < 25; i++) {
        const name = rand_name();
        const email = name + '@mail.copm';
        const util = PhoneNumberUtil.getInstance();
        const region = rand_elem(util.getSupportedRegions());
        const icountry = Country.getCountryByCode(region);
        const istate = rand_elem(State.getStatesOfCountry(icountry?.isoCode));
        const icity = rand_elem(City.getCitiesOfState(icountry?.isoCode || '', istate?.isoCode));

        let phone = util.getExampleNumber('US').getNationalNumberOrDefault().toString();
        phone = phone.substring(0, phone.length - 4) + Math.floor(Math.random() * 1000).toString().padStart(4, '0')
        result.push({
            name,
            email,
            phone,
            country: icountry?.isoCode || '',
            state: istate?.isoCode,
            city: icity?.name,
            created: r_date(),
            updated: r_date(),
        });
    }
    return result;
}

export const RecordsPage = (props: RecordsPageProps) => {
    const [data, setData] = useState<any[]>([]);
    const tableStateRef = useRef<MUIDataTableState>();
    const [selection, setSelection] = useState(get_selection_from_url(data));

    const [url, set_url] = useLocation();

    function on_table_state_changed(action: string, tableState: MUIDataTableState): void {
        tableStateRef.current = tableState;
        set_to_url(tableState, data);
    }

    const columns: MUIDataTableColumnDef[] = useMemo(() => {

        function dropdown_logic(location: string, filters: any[], row?: any[]): boolean {
            return !!filters.length && !filters.includes(location);
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

        const result: MUIDataTableColumn[] = [];
        result.push(default_column('name', {
            filterType: 'custom',
            filterOptions: {
                logic: dropdown_logic,
                display: create_dd_filter(),
            },
        }));
        result.push(default_column('email', {
            filterType: 'custom',
            filterOptions: {
                logic: dropdown_logic,
                display: create_dd_filter(),
            },
            customBodyRender: (email, tableMeta, updateValue) => {
                const {phone, country} = data.find(x => x.email == email);
                let numberUtil = PhoneNumberUtil.getInstance();
                try {
                    const phone_number = numberUtil.parse(phone, country);
                    return numberUtil.format(phone_number, PhoneNumberFormat.INTERNATIONAL);
                } catch (e) {
                    return phone;
                }
            },
        }, 'Phone'));
        result.push(default_column('email', {
            filterType: 'custom',
            filterOptions: {
                logic: dropdown_logic,
                display: create_dd_filter(),
            },
            customBodyRender: (email) => {
                const {country} = data.find(x => x.email == email);
                return Country.getCountryByCode(country)?.name || country;
            },
        }, 'Country'));
        result.push(default_column('email', {
            filterType: 'custom',
            filterOptions: {
                logic: dropdown_logic,
                display: create_dd_filter(),
            },
            customBodyRender: (email) => {
                const {country, state} = data.find(x => x.email == email);
                return State.getStateByCodeAndCountry(state, country)?.name || state;
            },
        }, 'State'));
        result.push(default_column('city', {
            filterType: 'custom',
            filterOptions: {
                logic: dropdown_logic,
                display: create_dd_filter(),
            },
        }));
        for (let [name, label] of [['created', 'Created date'], ['updated', 'Updated date']]) {
            result.push(default_column(name, {customBodyRender: date_render}, label));
        }
        result.push({
            name: 'email',
            label: 'Actions',
            options: {
                searchable: false,
                sort: false,
                filter: false,
                draggable: false,
                customBodyRender: (email) => {
                    return <Stack direction='row' spacing='8px'>
                        <IconButton onClick={() => {
                            const item = data.find(x => x.email == email);
                            props.set_edit({...item});
                            set_url(prevState => {
                                prevState.pathname = '/edit';
                                return prevState;
                            });
                            const selection = new Set([...getQParam('sel')?.split(' ') || [], email]);
                            setQParam('sel', Array.from(selection).join(','));
                        }}><Edit/></IconButton>
                        <IconButton><Delete/></IconButton>
                    </Stack>
                },
            },
        })
        set_filter_from_url(result);
        return result;
    }, [data, tableStateRef.current, props?.set_edit]);

    // debug loading items
    useEffect(() => {
        const result = generate_random_data();
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
                             rowsSelected: selection,
                             customToolbarSelect: () => <></>,
                         }}
    />
};