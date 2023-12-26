import {PhoneNumberUtil, RegionCode} from "google-libphonenumber";
import * as variables from "./static";
import {City, Country, State} from "country-state-city";
import {RecordType} from "./static";
import {default as fetch, Response} from "node-fetch";

export const generate = (country: RegionCode | undefined = undefined): Omit<variables.RecordType, 'created' | 'updated'> => {
    let util = PhoneNumberUtil.getInstance();
    if (!country) {
        const all = util.getSupportedRegions();
        country = all[Math.floor(Math.random() * all.length)];
    }

    if (!util.getSupportedRegions().includes(country))
        throw new Error('Unsupported: ' + country);

    const icountry = Country.getCountryByCode(country);
    if (!country)
        throw new Error('Unsupported: '+country);

    const states = State.getStatesOfCountry(icountry?.isoCode);
    const istate = states[Math.floor(Math.random() * states.length)];
    const cities = City.getCitiesOfState(icountry?.isoCode || '', istate?.isoCode);
    const icity = cities[Math.floor(Math.random() * cities.length)];

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
        country: icountry?.isoCode || '',
        state: istate?.isoCode,
        city: icity?.name,
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
        if (json_body.created)
            json_body.created = new Date(json_body.created);
        if (json_body.updated)
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