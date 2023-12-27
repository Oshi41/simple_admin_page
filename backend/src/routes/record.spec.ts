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
        $id = generate('US');
        await db.insertAsync($id);
    });

    it('works', async () => {
        const $set = generate('US');
        // @ts-ignore
        const res = await patch_data({$id, $set}, base_url.port);
        eq(res.status, 200);
        eq($set, _.pick(res.json_body, Object.keys($set)));
    });
});

// describe('[POST] /record', () => {
//     it('works', async () => {
//         const record = generate();
//         const keys = Object.keys(record);
//         const resp = await post_data(record, base_url.port);
//         eq(resp.status, 200);
//         const json_resp: variables.RecordType = resp.json_body;
//         eq(_.pick(record, keys), _.pick(json_resp, keys));
//         const all_data = await db.findAsync({});
//         eq(all_data.length, 1);
//         eq(all_data[0], json_resp);
//     });
//     it('failed due to repeating PK', async () => {
//         const record = generate();
//         const record2 = generate();
//         let resp = await post_data(record, base_url.port);
//         eq(resp.status, 200);
//
//         let copy: Partial<variables.RecordType> = {...record};
//         resp = await post_data(copy, base_url.port);
//         eq(resp.status, 400); // denied due to same obj
//
//         copy = {...record, email: record2.email};
//         resp = await post_data(copy, base_url.port);
//         eq(resp.status, 400); // denied due to same phone
//
//         copy = {...record, phone: record2.phone};
//         resp = await post_data(copy, base_url.port);
//         eq(resp.status, 400); // denied due to same phone
//     });
//     it('failed due to invalidate fields', async () => {
//         const _post = async (data: Partial<RecordType>, msg: string, expected = 400) => {
//             const resp = await post_data(data, base_url.port)
//             eq(resp.status, expected, `Have ${resp.status} but expected ${expected}, ${msg}`);
//         };
//
//         const record = generate('RU');
//         await _post({...record, state: 'Florida'}, 'Florida is not RU state');
//         await _post({...record, phone: record.phone?.replace(/\+/g, '')}, 'Phone without +');
//         await _post({...record, phone: record.phone + 'b'}, 'Phone with letters');
//         await _post({...record, name: 'Some name with 1'}, 'Name with numbers');
//         await _post({...record, email: 'some@mail@com'}, 'Wrong email format');
//     });
// });
// describe('[PATCH] /record', () => {
//     it('works', async () => {
//         const record = generate('US');
//         await db.insertAsync(record);
//         const $id = _.pick(record, ['email', 'phone']);
//         const $set = generate('US');
//         let resp = await patch_data({$id, $set}, base_url.port);
//         eq(resp.status, 200);
//         eq($set, _.pick(resp.json_body, Object.keys($set)));
//     });
//     // it('saved integrity (checking PK)', async () => {
//     //     const record = generate();
//     //     const other = generate();
//     //
//     //     let resp = await post_data(record, base_url.port);
//     //     eq(resp.status, 200);
//     //     resp = await post_data(other, base_url.port);
//     //     eq(resp.status, 200);
//     //
//     //     resp = await patch_data(record, other, base_url.port);
//     //     eq(resp.status, 400, 'Cannot patch as existing record');
//     //
//     //     resp = await patch_data(record, _.pick(other, ['email']), base_url.port);
//     //     eq(resp.status, 400, 'Cannot change email to existing one');
//     //
//     //     resp = await patch_data(record, _.pick(other, ['phone']), base_url.port);
//     //     eq(resp.status, 400, 'Cannot change phone to existing one');
//     //
//     //     resp = await patch_data(record, _.pick(other, ['phone', 'email']), base_url.port);
//     //     eq(resp.status, 400, 'Cannot change phone and phone to existing one');
//     // });
//     // it('using validation', async () => {
//     //     const record = generate();
//     //     let resp = await post_data(record, base_url.port);
//     //     eq(resp.status, 200);
//     //
//     //     resp = await patch_data(record, {country: 'Russia'}, base_url.port);
//     //     eq(resp.status, 400, 'You should change state with country accordingly');
//     //
//     //     resp = await patch_data(record, {email: 'mail@mail@com'}, base_url.port);
//     //     eq(resp.status, 400, 'Wrong email type');
//     //
//     //     resp = await patch_data(record, {phone: '+2'}, base_url.port);
//     //     eq(resp.status, 400, 'Wrong phone');
//     //
//     //     resp = await patch_data(record, {name: 'Me1'}, base_url.port);
//     //     eq(resp.status, 400, 'Name with numbers');
//     // });
// });
// describe('[DELETE] /record', () => {
//     it('works', async () => {
//         const record = generate();
//         await post_data(record, base_url.port);
//         const resp = await fetch(base_url, {
//             method: 'DELETE',
//             body: JSON.stringify(record),
//             headers: {
//                 'Accept': 'application/json',
//                 'Content-Type': 'application/json'
//             }
//         });
//         eq(resp.status, 200);
//         eq(db.getAllData().length, 0);
//     });
//     it('cannot remove twice', async ()=>{
//         const record = generate();
//         await post_data(record, base_url.port);
//         let resp = await delete_data(record, base_url.port);
//         eq(resp.status, 200);
//         resp = await delete_data(record, base_url.port);
//         eq(resp.status, 400);
//     });
//     it('cannot find item to remove', async ()=>{
//         const record = generate();
//         const other = generate();
//         await post_data(record, base_url.port);
//         let resp = await delete_data(other, base_url.port);
//         eq(resp.status, 400);
//     });
// });
