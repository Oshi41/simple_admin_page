import React, {useCallback, useMemo, useState} from "react";
import {Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography} from "@mui/material";
import MUIDataTable, {MUIDataTableColumn, MUIDataTableMeta} from "mui-datatables";
import {Table_url_state_manager} from "../table_url_state_manager";
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber';
import {RecordType} from "../schema";
import {City, Country, ICity, ICountry, IState, State} from "country-state-city";
import {Delete, Edit} from "@mui/icons-material";
import {useLocation} from "../hooks";

const number_util = PhoneNumberUtil.getInstance();

function locate(from: Partial<RecordType>): [ICountry | undefined, IState | undefined, ICity | undefined] {
    if (!from)
        return [undefined, undefined, undefined];

    const icountry = Country.getCountryByCode(from.country || '');
    const istate = State.getStateByCodeAndCountry(from.state || '', from.country || '');
    const cities = City.getCitiesOfState(from.country || '', from.state || '');
    const icity = cities.find(x => x.name == from.city);
    return [icountry, istate, icity];
}

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
};

export function RecordsPage(props: RecordsPageProps) {
    let {state_manager} = props;
    const [loading, set_loading] = useState(false);
    const [url, set_url] = useLocation();
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
                        const navigate_to = (path: string) => {
                            state_manager.selection = [tableMeta.rowIndex];
                            set_url(prevState => {
                                prevState.pathname = path;
                                return prevState;
                            });
                        };
                        return <Stack direction='row'>
                            <IconButton onClick={() => {
                                navigate_to('/edit');
                            }}><Edit/></IconButton>
                            <IconButton onClick={() => {
                                navigate_to('/delete');
                            }}><Delete/></IconButton>
                        </Stack>;
                    },
                },
            }
        ];
        return cols;
    }, [
        state_manager.data,
        state_manager.sort,
        state_manager.selection,
        state_manager.table_filters,
        set_url,
    ]);

    return <Box>
        <Dialog open={loading}>
            <DialogTitle>
                <Typography>Loading...</Typography>
            </DialogTitle>
            <DialogContent>
                <CircularProgress/>
            </DialogContent>
        </Dialog>

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
                          onFilterChange: state_manager.save_filter_to_url,
                      }}
        />
    </Box>;
}