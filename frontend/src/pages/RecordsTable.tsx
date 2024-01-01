import React, {useCallback, useMemo} from "react";
import {
    Box,
    IconButton,
    Stack,
    Tooltip
} from "@mui/material";
import MUIDataTable, {MUIDataTableColumn, MUIDataTableMeta} from "mui-datatables";
import {Table_url_state_manager} from "../table_url_state_manager";
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber';
import {Delete, Edit, Add} from "@mui/icons-material";
import {CustomDialog} from "../contorls/CustomDialog";

const number_util = PhoneNumberUtil.getInstance();

function date2str(d: Date | string): string {
    return new Date(d).toLocaleDateString('en-us', {
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
    state_manager: Table_url_state_manager,
    loading: boolean,
    go_to: (path: string, q?: { [key: string]: string }) => void,
};

export function RecordsTable(props: RecordsPageProps) {
    let {state_manager, go_to, loading} = props;
    const find_data_from_raw = useCallback((tableMeta: MUIDataTableMeta) => {
        const possible_emails = tableMeta.rowData.filter(x => typeof x == 'string' && x.includes('@'));
        const data_item = state_manager.data?.find(x => possible_emails.includes(x.email));
        return data_item;
    }, [state_manager.data,]);

    const columns: MUIDataTableColumn[] = useMemo(() => {
        let cols: MUIDataTableColumn[] = [
            {
                name: 'name',
                label: 'Name',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('name'),
                },
            },
            {
                label: 'Email',
                name: 'email',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('email'),
                },
            },
            {
                label: 'Phone',
                name: 'phone',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('phone'),
                    customBodyRender: (phone, tableMeta) => {
                        const {_phone} = find_data_from_raw(tableMeta) || {};
                        return _phone && number_util.format(_phone, PhoneNumberFormat.INTERNATIONAL)
                            || phone;
                    },
                },
            },
            {
                label: 'Country',
                name: 'country',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('country'),
                    customBodyRender: (country, tableMeta) => {
                        const {_location} = find_data_from_raw(tableMeta) || {};
                        return _location?.[0]?.name || country || '-';
                    },
                },
            },
            {
                label: 'State',
                name: 'state',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('state'),
                    customBodyRender: (state, tableMeta) => {
                        const {_location} = find_data_from_raw(tableMeta) || {};
                        return _location?.[1]?.name || state || '-';
                    },
                },
            },
            {
                label: 'City',
                name: 'city',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('city'),
                    customBodyRender: (city, tableMeta) => {
                        const {_location} = find_data_from_raw(tableMeta) || {};
                        return _location?.[2]?.name || city || '-';
                    },
                },
            },
            {
                label: 'Created date',
                name: 'created',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('created'),
                    customBodyRender: date2str,
                }
            },
            {
                label: 'Updated date',
                name: 'updated',
                options: {
                    searchable: true,
                    sort: true,
                    filter: true,
                    draggable: true,
                    sortThirdClickReset: true,
                    filterList: state_manager.get_col_filter('updated'),
                    customBodyRender: date2str,
                }
            },
            {
                name: 'actions',
                label: 'Actions',
                options: {
                    searchable: false,
                    sort: false,
                    filter: false,
                    draggable: false,
                    customBodyRender: (d, tableMeta) => {
                        const {email} = find_data_from_raw(tableMeta) || {};

                        return <Stack direction='row'>
                            <IconButton onClick={() => {
                                go_to('/edit', {sel: email});
                            }}><Edit/></IconButton>
                            <IconButton onClick={() => {
                                go_to('/delete', {sel: email});
                            }}><Delete/></IconButton>
                        </Stack>;
                    },
                },
            },
        ];
        return cols;
    }, [
        state_manager.data,
        state_manager.sort,
        state_manager.selection,
        state_manager.table_filters,
        go_to,
    ]);

    function CustomToolbar() {
        return <Tooltip title='Create new record'>
            <IconButton onClick={() => go_to('/create', {sel: ''})}>
                <Add/>
            </IconButton>
        </Tooltip>
    };

    return <Box>
        {CustomDialog(loading ? {type: 'loading'} : undefined)}

        <MUIDataTable columns={columns}
                      data={state_manager.data || []}
                      title='Records'
                      options={{
                          print: false,
                          download: false,
                          customToolbarSelect: () => <></>,
                          filterType: 'multiselect',
                          sortOrder: state_manager.sort,
                          onColumnSortChange: (name, direction) => {
                              state_manager.sort = {name, direction};
                          },
                          rowsSelected: state_manager.selection,
                          onRowSelectionChange: (cur, all, rowsSelected) => {
                              state_manager.selection = rowsSelected as number[];
                          },
                          onTableChange: (action, tableState) => {
                              state_manager.update_state(tableState);
                          },
                          onFilterChange: () => state_manager.save_filter_to_url(),
                          customToolbar: () => <CustomToolbar/>,
                      }}
        />
    </Box>;
}