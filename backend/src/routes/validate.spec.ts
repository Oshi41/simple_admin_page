import express from "express";
import Sinon, {createSandbox} from "sinon";
import {Server} from "node:http";
import router from '../routes/validate'
import {generate} from "../test_utils";
import {RecordType} from "../static";
import {default as fetch, Response} from "node-fetch";
import {deepStrictEqual as eq} from 'assert';
import {default as nedb} from "@seald-io/nedb";
import * as variables from "../static";
import {import_lo_dash} from "../utils";

const _ = import_lo_dash();

const base_url = new URL('http://localhost:7894/validate');
let app: express.Express, sb: Sinon.SinonSandbox, srv: Server, db: nedb;

type t = keyof RecordType;
const pk: t[] = ['phone', 'email'];

beforeEach(() => {
    db = new nedb({
        inMemoryOnly: true
    });
    sb = createSandbox();
    sb.replace(variables, 'db', db);

    app = express();
    app.use(express.json());
    app.use('/validate', router);
    srv = app.listen(base_url.port, () => {
        console.log('Server started on port: ' + base_url.port);
    });
});
afterEach(async function () {
    sb?.restore();
    srv?.close();
    await db?.dropDatabaseAsync();
});
describe('/validate', () => {
    const _generate = (): Partial<RecordType & { email2: string }> => {
        const result = generate('US');
        return {...result, email2: result.email};
    };
    describe('[POST] /create', () => {
        const validate = async (r: Partial<RecordType & {
            email2: string
        }>, full: boolean = false): Promise<Response & { json_body: any }> => {
            let url = new URL(`http://localhost:${base_url.port}/validate/create`);
            if (full)
                url.searchParams.set('full', 'true');
            const resp = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(r),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });
            let json_body = !resp.ok ? await resp.json() : undefined;
            return Object.assign(resp, {json_body});
        };

        it('works', async () => {
            const r = _generate();
            const resp = await validate(r);
            eq(resp.ok, true);
            eq(resp.status, 200);
        });
        it('wrong fields: name, email, country, state, city, phone', async () => {
            const valid_r = _generate();
            const map = new Map([
                ['name', {...valid_r, name: 'Name1'}],
                ['email', {...valid_r, email: 'me@mail@com', email2: 'me@mail@com'}],
                ['country', {...valid_r, country: 'US1'}],
                ['state', {...valid_r, state: 'Moscow'}],
                ['city', {...valid_r, city: 'Moscow'}],
                ['phone', {...valid_r, phone: '+8'}],
            ]);
            for (let [prop, r] of map) {
                const resp = await validate(r);
                eq(resp.status, 400);
                eq(resp.json_body.path, prop);
            }
        });
        describe('before apply', () => {
            it('no email confirmation', async () => {
                const r = _generate();
                delete r.email2;
                const resp = await validate(r, true);
                eq(resp.status, 400);
                eq(resp.json_body.path, 'email2');
            });
        })
    });
    describe('[POST] /edit', () => {
        let existing: Partial<RecordType>;
        beforeEach(async () => {
            existing = generate('US');
            await db.insertAsync(existing);
        });
        const validate = async (old: Partial<RecordType>, upd: Partial<RecordType>, full: boolean = false): Promise<Response & {
            json_body: any
        }> => {
            let url = new URL(`http://localhost:${base_url.port}/validate/edit`);
            if (full)
                url.searchParams.set('full', 'true');
            const resp = await fetch(url, {
                method: 'POST',
                body: JSON.stringify({old, upd}),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            });
            let json_body = !resp.ok ? await resp.json() : undefined;
            return Object.assign(resp, {json_body});
        };

        it('works', async () => {
            const resp = await validate(existing, {...existing, name: 'Upd'}, true);
            eq(resp.ok, true);
            eq(resp.status, 200);
        });
        it('do not pass old record PK', async ()=>{
            for (let prop of pk) {
                const resp = await validate(_.omit(existing, [prop]),
                    {...existing, name: 'Upd'},
                    true);
                eq(resp.status, 400);
                eq(resp.json_body.path, 'old.'+prop);
            }
        });
        it('changing to existing one', async () => {
            let other = generate('US');
            await db.insertAsync(other);


            for (let prop of pk) {
                const old = _.pick(existing, pk);
                // @ts-ignore
                const upd = {...existing, [prop]: other[prop]};
                const resp = await validate(old, upd, true);
                eq(resp.status, 400);
                eq(resp.json_body.path, prop);
            }
        });
        it('wrong fields: name, email, country, state, city, phone', async () => {
            const valid_r = existing;
            const map = new Map([
                ['name', {...valid_r, name: 'Name1'}],
                ['email', {...valid_r, email: 'me@mail@com', email2: 'me@mail@com'}],
                ['country', {...valid_r, country: 'US1'}],
                ['state', {...valid_r, state: 'Moscow'}],
                ['city', {...valid_r, city: 'Moscow'}],
                ['phone', {...valid_r, phone: '+8'}],
            ]);
            for (let [prop, r] of map) {
                const resp = await validate(valid_r, r, true);
                eq(resp.status, 400);
                eq(resp.json_body.path, prop);
            }
        });
    });

    // describe('validation for creating record request', () => {
    //     it('works', async function () {
    //         const r = _generate();
    //         let resp = await post_data(r, true);
    //         eq(resp.ok, true);
    //         eq(resp.status, 200);
    //     });
    //     it('emails do not match', async function () {
    //         const r = _generate();
    //         r.email2 += 'b';
    //         let resp = await post_data(r, true);
    //         eq(resp.status, 400);
    //         eq(resp.json_body.path, 'email2');
    //     });
    // });
    // describe('validation for editing record request', () => {
    //     it('works', async function () {
    //         const r = generate();
    //         let resp = await post_data(r);
    //         eq(resp.ok, true);
    //         eq(resp.status, 200);
    //     });
    //     it('wrong field email2', async function () {
    //         const r = generate();
    //         let resp = await post_data(r);
    //         eq(resp.status, 400);
    //         eq(resp.json_body.path, 'email2');
    //     });
    // });
});