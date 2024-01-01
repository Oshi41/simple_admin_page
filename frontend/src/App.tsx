import {Box, Typography} from "@mui/material";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {MUIDataTableState} from "mui-datatables";
import {useLocation} from "./hooks";
import {Table_url_state_manager} from "./table_url_state_manager";
import {PhoneNumber} from "google-libphonenumber";
import {ICity, ICountry, IState} from "country-state-city";
import {RecordType} from "./schema";
import {RecordsTable} from "./pages/RecordsTable";
import _ from 'lodash';
import {RecordForm} from "./pages/RecordForm";
import {enrich_data, get_all_records, delete_record} from "./fetch";
import {CustomDialog, DialogContentProps} from "./contorls/CustomDialog";

type TableData = RecordType & {
    _location: [ICountry | undefined, IState | undefined, ICity | undefined],
    _phone?: PhoneNumber,
};

export default function App() {
    const [loading, set_loading] = useState(false);
    const table_state = useRef<MUIDataTableState>();
    const [table_data, set_table_data] = useState<TableData[]>([]);
    const [url, set_url] = useLocation();
    const [n, set_n] = useState(0);
    const mark_dirty = useCallback(() => set_n(p => p + 1), []);
    const go_to = useCallback((path: string, q?: { [key: string]: string }) => {
        set_url(u => {
            u.pathname = path;
            _.forOwn(q, (value, key) => {
                if (value)
                    u.searchParams.set(key, value + '');
                else
                    u.searchParams.delete(key);
            });
            return u;
        });
        mark_dirty();
    }, [mark_dirty, set_url]);
    const [dialog_content, set_dialog_content] = useState<DialogContentProps>();

    const state_manager = new Table_url_state_manager(table_state, table_data, mark_dirty);

    useEffect(function load_from_server() {
        set_loading(true);

        get_all_records()
            .then(x => set_table_data(x))
            .finally(() => set_loading(false))
    }, []);

    return <Box>
        {url.pathname == '/edit' && state_manager.active_item &&
            <RecordForm go_to={go_to}
                        source={state_manager.active_item}
                        on_confirm={x => state_manager.active_item = x}/>
        }

        {url.pathname == '/create' &&
            <RecordForm go_to={go_to}
                        source={undefined}
                        on_confirm={x => {
                            // @ts-ignore
                            set_table_data(data => [...data, ...enrich_data([x])]);
                        }}/>
        }

        {url.pathname == '/delete' && !dialog_content && state_manager.active_item &&
            <CustomDialog type='delete'
                          click_away={() => go_to('/all')}
                          content={<Typography>
                              Are you sure you want to delete <u>{state_manager.active_item.name}</u> record?
                          </Typography>}
                          buttons={{
                              ok: {
                                  label: 'Delete',
                                  on_click: () => {
                                      set_loading(true);
                                      delete_record(state_manager.active_item)
                                          .then(x => {
                                              const {email} = state_manager.active_item || {};
                                              set_table_data(prev => prev.filter(x => email != x.email));
                                              const on_close = () => {
                                                  set_dialog_content(undefined);
                                                  go_to('/all');
                                              };
                                              set_dialog_content({
                                                  type: 'message',
                                                  label: 'Deletion confirmed',
                                                  content: 'Record was deleted',
                                                  click_away: on_close,
                                                  buttons: {ok: {on_click: on_close,},},
                                              });
                                              go_to('/all');
                                          })
                                          .catch((e: any) => {
                                              set_dialog_content({
                                                  type: 'error',
                                                  label: 'Deletion error',
                                                  content: e.message,
                                                  click_away: () => {
                                                      set_dialog_content(undefined);
                                                  },
                                              });
                                          })
                                          .finally(() => set_loading(false));
                                  },
                              },
                              cancel: {
                                  on_click: () => go_to('/all'),
                              },
                          }}
            />
        }

        {CustomDialog(dialog_content)}

        <RecordsTable state_manager={state_manager}
                      loading={loading}
                      go_to={go_to}
        />

    </Box>
}