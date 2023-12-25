import {import_lo_dash} from "./utils";
import express, {Express} from "express";
import {default as nedb} from "@seald-io/nedb";
import path from "path";
import joi from "joi";
import {PhoneNumberUtil, RegionCode} from "google-libphonenumber";
import {Country, ICountry, State} from "country-state-city";

const _ = import_lo_dash();

const countries: Map<string, ICountry> = new Map(Country.getAllCountries().map(x => [x.name, x]));
const states = new Map(Array.from(countries.values()).map(x => [x, State.getStatesOfCountry(x.isoCode)]));

export const app: Express = express();
export const db = new nedb({
    filename: path.resolve('./store.jsonl'),
    autoload: true,
    async onload(error: Error | null): Promise<any> {
        await db.ensureIndexAsync({unique: true, fieldName: 'email'});
        await db.ensureIndexAsync({unique: true, fieldName: 'phone'});
    }
});
export const schema = joi.object({
    name: joi.string().regex(/^[a-zA-Z ]*$/).required(),
    phone: joi.string().regex(/^\+[0-9\-/ ()]+$/).custom((value, helpers) => {
        const origin = helpers.state.ancestors[0];
        const country_name = origin.country;
        const country = countries.get(country_name);
        if (!country)
            throw new Error('No such country: ' + country_name);
        const p_util = PhoneNumberUtil.getInstance();
        const iso_code = p_util.getSupportedRegions().find(x=>x == country.isoCode);
        const parsed = p_util.parse(value.replace('+', ''), iso_code);
        const country_code = p_util.getRegionCodeForNumber(parsed);
        if (country_code != country.isoCode)
            throw new Error(`Phone assigned to region ${country_code} but user is from ${country.isoCode}`);
        return value;
    }).required(),
    email: joi.string().email().required(),
    country: joi.string().custom(value => {
        if (!countries.has(value))
            throw new Error('no such country: ' + value);
        return value;
    }).required(),
    state: joi.string().custom((value, helpers) => {
        const origin = helpers.state.ancestors[0];
        const country_name = origin.country;
        const country = countries.get(country_name);
        if (!country)
            throw new Error('No such country: ' + country_name);
        const allowed = states.get(country);
        if (!allowed)
            throw new Error('No states for this country: ' + country_name);
        const state = allowed.find(x => x.name == value);
        if (!state)
            throw new Error(`No such state [${value}] for this country [${country_name}]`);
        return value;
    }).required(),
    created: joi.date(),
    updated: joi.date(),
});

export type RecordType = {
    name: string,
    phone: string,
    email: string,
    country: string,
    state: string,
    created: Date,
    updated: Date,
}