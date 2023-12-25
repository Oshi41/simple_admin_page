import {default as nedb} from "@seald-io/nedb";
import Sinon, {createSandbox} from "sinon";
import * as variables from "../static";
import express from "express";
import record_router from "./record";
import records_router from "./records";
import {Server} from "node:http";
import {generate, post_data} from "../test_utils";
import {deepStrictEqual as eq} from 'assert';
import {import_lo_dash} from "../utils";
import {RecordType} from "../static";

const _ = import_lo_dash();

const base_url = new URL('http://localhost:7894');
let app: express.Express, db: nedb, sb: Sinon.SinonSandbox, srv: Server;

beforeEach(async function () {
    db = new nedb({
        inMemoryOnly: true
    });
    sb = createSandbox();
    sb.replace(variables, 'db', db);
    await db.ensureIndexAsync({unique: true, fieldName: 'email'});
    await db.ensureIndexAsync({unique: true, fieldName: 'phone'});

    app = express();
    app.use(express.json());
    app.use('/record', record_router);
    app.use('/records', records_router);
    srv = app.listen(base_url.port, () => {
        console.log('Server started on port: ' + base_url.port);
    });
});
afterEach(async function () {
    sb?.restore();
    await db?.dropDatabaseAsync();
    srv?.close();
});

describe('[GET] /records', () => {
    it('works with post', async () => {
        const record = generate();
        await post_data(record, base_url.port);
        let resp = await fetch(base_url.toString() + 'records', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        eq(resp.status, 200);
        let array: RecordType[] = await resp.json();
        eq(array.length, 1);
        eq(record, _.pick(array[0], Object.keys(record)));
    });
    it('works with db insertion', async ()=>{
        const record = generate();
        await db.insertAsync(record);
        let resp = await fetch(base_url.toString() + 'records', {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        eq(resp.status, 200);
        let array: RecordType[] = await resp.json();
        eq(array.length, 1);
        eq(record, _.pick(array[0], Object.keys(record)));
    });
});