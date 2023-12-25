import React from 'react';
import {Paper, Tab, Table, TableContainer, Tabs} from "@mui/material";
import {RecordsPage} from "./pages/RecordsTable";
import {RecordForm} from "./pages/RecordForm";

function App() {
    return (
        <RecordForm/>
        // <RecordsPage/>
    );
}

export default App;
