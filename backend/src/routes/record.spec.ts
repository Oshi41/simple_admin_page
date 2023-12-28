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
import {RegionCode} from "google-libphonenumber";

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

const _generate = (code: RegionCode): Omit<variables.RecordType, 'created' | 'updated'> & { email2?: string } => {
    let r = generate(code);
    return Object.assign(r, {email2: r.email});
}

describe('[POST] /record', () => {
    it('works', async () => {
        const codes: RegionCode[] = ['MC', 'US'];
        for (let country of codes) {
            const record = _generate(country);
            const resp = await post_data(record, base_url.port);
            eq(resp.status, 200);
            delete record.email2;
            eq(record, _.pick(resp.json_body, Object.keys(record)));
        }
    });
    it('failed due to edit obj validation', async () => {
        const valid_r = _generate('US');
        const map = new Map([
            ['name', {...valid_r, name: 'Name1'}],
            ['email', {...valid_r, email: 'me@mail@com', email2: 'me@mail@com'}],
            ['country', {...valid_r, country: 'US1'}],
            ['state', {...valid_r, state: 'Moscow'}],
            ['city', {...valid_r, city: 'Moscow'}],
            ['phone', {...valid_r, phone: '+8'}],
            ['email2', _.omit(valid_r, 'email2')],
            ['email2', {...valid_r, email2: '123@mail@com'}],
        ]);
        map.forEach(async (record, key) => {
            const resp = await post_data(record, base_url.port);
            eq(resp.status, 400);
            eq(resp.json_body?.path, key);
        });
    });
    it('failed due to PK', async () => {
        const valid_r = generate('US');
        const other = _generate('US');
        await db.insertAsync(valid_r);
        const failed = [
            {...other, phone: valid_r.phone},
            {...other, email: valid_r.email, email2: valid_r.email},
            {...other, phone: valid_r.phone, email: valid_r.email, email2: valid_r.email},
        ];
        for (let record of failed) {
            const resp = await post_data(record, base_url.port);
            eq(resp.status, 400);
        }
    });
});

describe('[PATCH] /record', () => {
    let $id: Partial<RecordType>;
    beforeEach(async () => {
        $id = await db.insertAsync(generate('US'));
    });

    it('works', async () => {
        const $set = generate('US');
        // @ts-ignore
        const res = await patch_data({$id, $set}, base_url.port);
        eq(res.status, 200);
        eq($set, _.pick(res.json_body, Object.keys($set)));
    });
    it('works with remove state and city', async ()=>{
        const $set = generate('AX');
        const $unset = {state: 1, city: 1};
        // @ts-ignore
        const res = await patch_data({$id, $set, $unset}, base_url.port);
        eq(res.status, 200);
        eq($set, _.pick(res.json_body, Object.keys($set)));
    });
    it('works with remove city', async ()=>{
        const $set = generate('AL');
        $set.state = '01'; // Berat County
        const $unset = {city: 1};
        // @ts-ignore
        const res = await patch_data({$id, $set, $unset}, base_url.port);
        eq(res.status, 200);
        eq($set, _.pick(res.json_body, Object.keys($set)));
    });
    it('deny due to PK', async ()=>{
        const other = generate('US');
        const failed = [
            ['email', {...other, email: $id.email}],
            ['phone', {...other, phone: $id.phone}],
            ['phone', {...other, phone: $id.phone, email: $id.email}],
        ];

        for (let [prop, patch] of failed) {
            // @ts-ignore
            const res = await patch_data({$id, $set: patch}, base_url.port);
            eq(res.status, 400);
            eq(res.json_body?.path, '$id.'+prop);
        }
    });
    it('deny due to wrong location', async ()=>{
        const other = generate('US');
        const test_data = [
            ['city', other, {state: 1}],         // implementations nuanses
            ['phone', {...other, country: 'RU'}],   // implementations nuanses
            ['city', other, {city: 1}],
            ['city', {...other, city: 'Moscow'}],
        ];

        for (let [prop, $set, $unset] of test_data) {
            // @ts-ignore
            const res = await patch_data({$id, $set, $unset}, base_url.port);
            eq(res.status, 400);
            eq(res.json_body?.path, prop);
        }
    });
    it('failed due to wrong fields', async ()=>{
        const valid_r = generate('US');
        const map = new Map([
            ['name', {...valid_r, name: 'Name1'}],
            ['email', {...valid_r, email: 'me@mail@com', email2: 'me@mail@com'}],
            ['country', {...valid_r, country: 'US1'}],
            ['state', {...valid_r, state: 'Moscow'}],
            ['city', {...valid_r, city: 'Moscow'}],
            ['phone', {...valid_r, phone: '+8'}],
        ]);
        for (let [prop, $set] of map) {
            // @ts-ignore
            const resp = await patch_data({$id, $set}, base_url.port);
            eq(resp.status, 400);
            eq(resp.json_body.path, prop);
        }
    });
});

describe('[DELETE] /record', ()=>{
    let $id: Partial<RecordType>;
    beforeEach(async () => {
        $id = await db.insertAsync(generate('US'));
    });

    it('works', async ()=>{
        const resp = await delete_data($id, base_url.port)
        eq(resp.ok, true);
        eq(resp.status, 200);
        eq(await db.countAsync({}), 0);
    });
    it('cannot remove not existing object', async ()=>{
        const other = generate('US');
        const resp = await delete_data(other, base_url.port)
        eq(resp.status, 400);
        eq(await db.findAsync({}), [$id]);
    });
    it('cannot remove without PK', async ()=>{
        const resp = await delete_data(_.omit($id, '_id phone email'.split(' ')), base_url.port)
        eq(resp.status, 400);
        eq(await db.findAsync({}), [$id])
    });
});
