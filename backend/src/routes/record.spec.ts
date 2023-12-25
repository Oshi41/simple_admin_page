import express from "express";
import router from './record';
import * as variables from "../static";
import {deepStrictEqual as eq} from 'assert';
import {import_lo_dash} from "../utils";
import Sinon, {createSandbox, SinonSandbox} from 'sinon';
import {default as nedb} from "@seald-io/nedb";
import {RecordType} from "../static";
import {Server} from "node:http";
import {generate, post_data, patch_data, delete_data} from "../test_utils";

const _ = import_lo_dash();

const base_url = new URL('http://localhost:7894/record');
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
    app.use('/record', router);
    srv = app.listen(base_url.port, () => {
        console.log('Server started on port: ' + base_url.port);
    });
});
afterEach(async function () {
    sb?.restore();
    await db?.dropDatabaseAsync();
    srv?.close();
});

describe('[POST] /record', () => {
    it('works', async () => {
        const record = generate();
        const keys = Object.keys(record);
        const resp = await post_data(record, base_url.port);
        eq(resp.status, 200);
        const json_resp: variables.RecordType = resp.json_body;
        eq(_.pick(record, keys), _.pick(json_resp, keys));
        const all_data = await db.findAsync({});
        eq(all_data.length, 1);
        eq(all_data[0], json_resp);
    });
    it('deny repeating PK', async () => {
        const record = generate();
        const record2 = generate();
        let resp = await post_data(record, base_url.port);
        eq(resp.status, 200);

        let copy: Partial<variables.RecordType> = {...record};
        resp = await post_data(copy, base_url.port);
        eq(resp.status, 400); // denied due to same obj

        copy = {...record, email: record2.email};
        resp = await post_data(copy, base_url.port);
        eq(resp.status, 400); // denied due to same phone

        copy = {...record, phone: record2.phone};
        resp = await post_data(copy, base_url.port);
        eq(resp.status, 400); // denied due to same phone
    });
    it('denied invalidate data', async () => {
        const _post = async (data: Partial<RecordType>, msg: string, expected = 400) => {
            const resp = await post_data(data, base_url.port)
            eq(resp.status, expected, `Have ${resp.status} but expected ${expected}, ${msg}`);
        };

        const record = generate('RU');
        await _post({...record, state: 'Florida'}, 'Florida is not RU state');
        await _post({...record, phone: record.phone?.replace(/\+/g, '')}, 'Phone without +');
        await _post({...record, phone: record.phone + 'b'}, 'Phone with letters');
        await _post({...record, name: 'Some name with 1'}, 'Name with numbers');
        await _post({...record, email: 'some@mail@com'}, 'Wrong email format');
    });
});
describe('[PATCH] /record', () => {
    it('works', async () => {
        const record = generate();
        const other = generate();
        let resp = await post_data(record, base_url.port);
        eq(resp.status, 200);

        resp = await patch_data(record, other, base_url.port);
        eq(resp.status, 200);

        const keys = Object.keys(other);
        eq(other, _.pick(resp.json_body, keys));
    });
    it('saved integrity (checking PK)', async () => {
        const record = generate();
        const other = generate();

        let resp = await post_data(record, base_url.port);
        eq(resp.status, 200);
        resp = await post_data(other, base_url.port);
        eq(resp.status, 200);

        resp = await patch_data(record, other, base_url.port);
        eq(resp.status, 400, 'Cannot patch as existing record');

        resp = await patch_data(record, _.pick(other, ['email']), base_url.port);
        eq(resp.status, 400, 'Cannot change email to existing one');

        resp = await patch_data(record, _.pick(other, ['phone']), base_url.port);
        eq(resp.status, 400, 'Cannot change phone to existing one');

        resp = await patch_data(record, _.pick(other, ['phone', 'email']), base_url.port);
        eq(resp.status, 400, 'Cannot change phone and phone to existing one');
    });
    it('using validation', async () => {
        const record = generate();
        let resp = await post_data(record, base_url.port);
        eq(resp.status, 200);

        resp = await patch_data(record, {country: 'Russia'}, base_url.port);
        eq(resp.status, 400, 'You should change state with country accordingly');

        resp = await patch_data(record, {email: 'mail@mail@com'}, base_url.port);
        eq(resp.status, 400, 'Wrong email type');

        resp = await patch_data(record, {phone: '+2'}, base_url.port);
        eq(resp.status, 400, 'Wrong phone');

        resp = await patch_data(record, {name: 'Me1'}, base_url.port);
        eq(resp.status, 400, 'Name with numbers');
    });
});
describe('[DELETE] /record', () => {
    it('works', async () => {
        const record = generate();
        await post_data(record, base_url.port);
        const resp = await fetch(base_url, {
            method: 'DELETE',
            body: JSON.stringify(record),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        eq(resp.status, 200);
        eq(db.getAllData().length, 0);
    });
    it('cannot remove twice', async ()=>{
        const record = generate();
        await post_data(record, base_url.port);
        let resp = await delete_data(record, base_url.port);
        eq(resp.status, 200);
        resp = await delete_data(record, base_url.port);
        eq(resp.status, 400);
    });
    it('cannot find item to remove', async ()=>{
        const record = generate();
        const other = generate();
        await post_data(record, base_url.port);
        let resp = await delete_data(other, base_url.port);
        eq(resp.status, 400);
    });
});
