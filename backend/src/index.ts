import {app} from "./static";
import record_router from './routes/record';
import records_router from './routes/records';
import express from "express";
import path from "path";

export function run() {
    app.use(express.json());
    console.log(path.resolve(__dirname, '../static'));
    app.use(express.static(path.resolve(__dirname, '../static')));

    app.use('/record', record_router);
    app.use('/records', records_router);

    app.use((req, res, next) => {
        res.sendFile(path.resolve(__dirname, '../static/index.html'));
    });

    const port = 7894;
    app.listen(port, () => {
        console.log('Server was started on http://localhost:' + port);
    });
}

if (module?.require?.main?.id == module?.id)
    run();

