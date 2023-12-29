import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Box, CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Typography
} from "@mui/material";
import {RecordForm} from "./pages/RecordForm";
import {RecordType} from "./schema";
import {get_all_records} from "./fetch";
import {PhoneNumber, PhoneNumberFormat, PhoneNumberUtil} from "google-libphonenumber";
import {City, Country, ICity, ICountry, IState, State} from "country-state-city";
import {RecordsPage} from "./pages/RecordsTable";
import {MUIDataTableState} from "mui-datatables";
import {Table_url_state_manager} from "./table_url_state_manager";
import {useLocation} from "./hooks";

const number_util = PhoneNumberUtil.getInstance();

type TableData = RecordType & {
    _location: [ICountry | undefined, IState | undefined, ICity | undefined],
    _phone?: PhoneNumber,
};

function locate(from: Partial<RecordType>): [ICountry | undefined, IState | undefined, ICity | undefined] {
    if (!from)
        return [undefined, undefined, undefined];

    const icountry = Country.getCountryByCode(from.country || '');
    const istate = State.getStateByCodeAndCountry(from.state || '', from.country || '');
    const cities = City.getCitiesOfState(from.country || '', from.state || '');
    const icity = cities.find(x => x.name == from.city);
    return [icountry, istate, icity];
}

enum dialog_paths {
    '/edit',
    '/edit_done',
    '/delete',
    '/delete_confirm',
    '/create',
    '/create_done',
}

function App() {
    const table_ref = useRef<MUIDataTableState>();
    const data_ref = useRef<TableData[]>();
    const [n, set_n] = useState(0);
    const mark_dirty = useCallback(() => set_n(p => p + 1), []);
    const table_manager = new Table_url_state_manager(table_ref, data_ref, mark_dirty);
    const [loading, set_loading] = useState(false);
    const [url, set_url] = useLocation();
    const go_to = useCallback((path: string) => {
        set_url(prevState => {
            prevState.pathname = path;
            return prevState;
        });
        mark_dirty();
    }, [set_url]);
    const active_item = useMemo(() => {
        const index = table_manager.selection?.[0];
        if (Number.isInteger(index) && index >= 0)
            return table_manager.data?.[index]
        return undefined;
    }, [table_manager.selection, table_manager.data]);

    useEffect(function load_from_srv() {
        set_loading(true);

        get_all_records()
            .then(data => {
                const result: TableData[] = [];
                for (let elem of data) {
                    let _phone: PhoneNumber | undefined = undefined;
                    try {
                        _phone = number_util.parse(elem.phone, elem.country);
                    } catch (e) {
                    }
                    const add: TableData = {
                        ...elem,
                        _phone,
                        _location: locate(elem),
                    };
                    result.push(add);
                }
                table_manager.data = result;
            })
            .finally(() => set_loading(false));
    }, []);

    return (
        <Box>
            <Dialog open={loading || dialog_paths.hasOwnProperty(url.pathname)}
                    onClose={() => go_to('/all')}>
                <DialogTitle>
                    {loading && <Typography>Loading...</Typography>}
                    {['/edit', '/create'].includes(url.pathname) &&
                        <RecordForm go_to={go_to}
                                    source={active_item || {}}/>
                    }
                </DialogTitle>
                <DialogContent sx={{alignSelf: 'center'}}>
                    {loading && <CircularProgress/>}
                </DialogContent>
            </Dialog>

            <RecordsPage state_manager={table_manager}/>
        </Box>
    );
}

export default App;
