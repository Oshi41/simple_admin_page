import React, {useEffect, useMemo, useState} from 'react';
import {Box, Dialog, Paper, Tab, Table, TableContainer, Tabs} from "@mui/material";
import {RecordsPage} from "./pages/RecordsTable";
import {RecordForm} from "./pages/RecordForm";
import {useLocation} from "./hooks";
import {RecordType} from "./schema";

function App() {
    const [url, setUrl] = useLocation();
    const editing = useMemo(() => url.pathname.endsWith('/edit'), [url]);
    const creating = useMemo(() => url.pathname.endsWith('/create'), [url]);
    const [src, setSrc] = useState<Partial<RecordType>>();

    useEffect(() => {
        if (!editing && !creating && !url.pathname.endsWith('/all'))
            setUrl(prevState => {
                prevState.pathname = '/all';
                return prevState;
            });
    }, [url]);

    return (
        <Box>
            <Dialog open={(editing || creating)} onClose={()=>{
                setSrc(undefined);
                setUrl(prevState => {
                    prevState.pathname = '/all';
                    return prevState;
                });
            }}>
                <RecordForm source={src}/>
            </Dialog>
            <RecordsPage set_edit={setSrc}/>
        </Box>
    );
}

export default App;
