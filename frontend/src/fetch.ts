import {RecordType} from "./schema";
import _ from 'lodash';
import {PhoneNumberUtil} from "google-libphonenumber";
import {City, Country, State} from "country-state-city";

function sleep(mls: number) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(true);
        }, mls)
    })
}

/**
 * Creating new record
 * @param r record create object
 * @throws {Error & {path: string}} - on http 400
 * @throws Error - on http 500
 */
async function create_record(r: Partial<RecordType & { email2: string }>): Promise<RecordType> {
    const resp = await fetch('/record', {
        method: 'POST',
        body: JSON.stringify(r),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });
    if (resp.ok)
        return await resp.json() as RecordType;

    if (resp.status == 500)
        throw new Error(await resp.text());
    if (resp.status == 400) {
        const {path, message} = await resp.json();
        throw Object.assign(new Error(message), {path});
    }

    throw new Error('Wrong status: ' + resp.status);
}

/**
 * Request all records
 * @throws Error on server side errors
 */
async function get_all_records_prod(): Promise<RecordType[]> {
    const resp = await fetch('/records', {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });
    if (resp.ok)
        return await resp.json() as RecordType[];

    throw new Error(await resp.text() + ' ' + resp.status);
}

async function get_all_records_dev(): Promise<RecordType[]> {
    // some delay
    await sleep(Math.random() * 3_000);
    const rand_name = () => {
        const name = Math.floor(Math.random() * 1_000_000).toString()
            .replace(/0/g, 'a')
            .replace(/1/g, 'b')
            .replace(/2/g, 'c')
            .replace(/3/g, 'd')
            .replace(/4/g, 'e')
            .replace(/5/g, 'f')
            .replace(/6/g, 'j')
            .replace(/7/g, 'h')
            .replace(/8/g, 'i')
            .replace(/9/g, 'j');
        return name;
    }
    const r_date = () => new Date(new Date().valueOf() - Math.random() * Math.pow(10, 12));

    function rand_elem<T>(arr: T[]): T {
        let index = Math.floor(Math.random() * arr.length);
        return arr[index];
    }

    const result: RecordType[] = [];
    for (let i = 0; i < 25; i++) {
        const name = rand_name();
        const email = name + '@mail.copm';
        const util = PhoneNumberUtil.getInstance();
        const region = rand_elem(util.getSupportedRegions());
        const icountry = Country.getCountryByCode(region);
        const istate = rand_elem(State.getStatesOfCountry(icountry?.isoCode));
        const icity = rand_elem(City.getCitiesOfState(icountry?.isoCode || '', istate?.isoCode));

        let phone = util.getExampleNumber('US').getNationalNumberOrDefault().toString();
        phone = '+'+phone.substring(0, phone.length - 4) + Math.floor(Math.random() * 1000).toString().padStart(4, '0')
        result.push({
            name,
            email,
            phone,
            country: icountry?.isoCode || '',
            state: istate?.isoCode,
            city: icity?.name,
            created: r_date(),
            updated: r_date(),
        });
    }
    result.push({
        name: 'Name',
        email: 'name@mail.com',
        phone: '+555 123 45 78',
        country: 'US',
        state: 'Florida',
        city: 'Florida',
        created: r_date(),
        updated: r_date(),
    })
    return result;
}

/**
 * Requesting to edit record
 * @param $id - id of editing record (email/phone props)
 * @param edited - changes we want to apply
 * @throws {Error & {path: string}} - on http 400
 * @throws Error - on http 500
 */
async function edit_record($id: Partial<RecordType>, edited: Partial<RecordType>) {
    $id = _.pick($id, 'email');
    type t = keyof RecordType;
    const set_fields: t[] = ['name', 'email', 'phone', 'country', 'state', 'city'];
    const unset_fields: t[] = ['state', 'city'];
    const $set = _.fromPairs(set_fields.map(x => [x, edited[x]])
        .filter(x => !!x[1]));
    const $unset = _.fromPairs(unset_fields.map(x => [x, !edited[x] ? 1 : 0])
        .filter(x => !x[1]));

    const resp = await fetch('/record', {
        method: 'PATCH',
        body: JSON.stringify({$id, $set, $unset}),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });

    if (resp.ok)
        return await resp.json() as RecordType;

    if (resp.status == 500)
        throw new Error(await resp.text());
    if (resp.status == 400) {
        const {path, message} = await resp.json();
        throw Object.assign(new Error(message), {path});
    }

    throw new Error('Wrong status: ' + resp.status);
}

const is_dev = true;

/**
 * Request all records
 * @throws Error on server side errors
 */
export const get_all_records = is_dev ? get_all_records_dev : get_all_records_prod;
