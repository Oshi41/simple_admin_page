import {PhoneNumberUtil, RegionCode} from "google-libphonenumber";
import * as variables from "./static";
import {Country, State} from "country-state-city";
import {RecordType} from "./static";
import {default as fetch, Response} from "node-fetch";

export const generate = (country: RegionCode = 'US'): Partial<variables.RecordType> => {
    let util = PhoneNumberUtil.getInstance();
    if (!util.getSupportedRegions().includes(country))
        throw new Error('Unsupported: ' + country);

    const country_desc = Country.getCountryByCode(country)
    if (!country_desc)
        throw new Error('Unsupported: ' + country);

    const state = State.getStatesOfCountry(country)?.[0];
    if (!state)
        throw new Error('Unsupported: ' + country);

    const phone = util.getExampleNumber(country).getNationalNumberOrDefault().toString().slice(0, -1)
        + Math.floor(Math.random() * 10);
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

    return {
        name,
        email: name + '@mail.com',
        country: country_desc.name,
        state: state.name,
        phone: '+' + phone,
    };
};

export const post_data = async (data: Partial<RecordType>, port: number | string): Promise<Response & {
    json_body: any
}> => {
    const resp = await fetch(`http://localhost:${port}/record`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });
    let json_body = undefined;
    if (resp.ok) {
        json_body = await resp.json();
        json_body.created = new Date(json_body.created);
        json_body.updated = new Date(json_body.updated);
    }
    return Object.assign(resp, {json_body});
};

export const patch_data = async (from: Partial<RecordType>, data: Partial<RecordType>, port: number | string): Promise<Response & {
    json_body: any
}> => {
    const resp = await fetch(`http://localhost:${port}/record`, {
        method: 'PATCH',
        body: JSON.stringify({
            prev: from,
            patch: data,
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });
    let json_body = undefined;
    if (resp.ok) {
        json_body = await resp.json();
        json_body.created = new Date(json_body.created);
        json_body.updated = new Date(json_body.updated);
    }
    return Object.assign(resp, {json_body});
};

export const delete_data = async (id: Partial<RecordType>, port: string | number): Promise<Response & {
    json_body: any
}> => {
    const resp = await fetch(`http://localhost:${port}/record`, {
        method: 'DELETE',
        body: JSON.stringify(id),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });
    let json_body = undefined;
    return Object.assign(resp, {json_body});
};