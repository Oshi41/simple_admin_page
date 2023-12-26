import joi from "joi";
import {PhoneNumberUtil} from "google-libphonenumber";
import {Country, ICountry, State, City} from "country-state-city";
import {RecordType} from "./static";

const countries: Map<string, ICountry> = new Map(Country.getAllCountries().map(x => [x.isoCode, x]));
const states = new Map(Array.from(countries.values()).map(x => [x, new Map(State.getStatesOfCountry(x.isoCode).map(x => [x.isoCode, x]))]));

export const schema = joi.object({
    name: joi.string().regex(/^[a-zA-Z ]*$/).min(1).max(100).required(),
    phone: joi.string().regex(/^\+[0-9\-/ ()]+$/).custom((value, helpers) => {
        const p_util = PhoneNumberUtil.getInstance();
        const origin = helpers.state.ancestors[0];
        const country_name = origin.country;
        const country = countries.get(country_name);
        if (!country) {
            // parsing as is
            const _phone = p_util.parse(value);
            if (!p_util.isValidNumber(_phone))
                throw new Error('Wrong phone format');
        } else {
            const iso_code = p_util.getSupportedRegions().find(x => x == country.isoCode);
            const parsed = p_util.parse(value.replace('+', ''), iso_code);
            const country_code = p_util.getRegionCodeForNumber(parsed);
            if (country_code != country.isoCode)
                throw new Error(`Phone assigned to region ${country_code} but user is from ${country.isoCode}`);
            return value;
        }
    }).required(),
    email: joi.string().email().min(4).max(150).required(),
    country: joi.string().custom(value => {
        if (!countries.has(value))
            throw new Error('no such country: ' + value);
        return value;
    }).required(),
    state: joi.string().custom((value, helpers) => {
        const origin = helpers.state.ancestors[0];
        const country_iso = origin.country;
        const country = countries.get(country_iso);
        if (!country)
            throw new Error('No such country: ' + country_iso);
        const allowed = states.get(country);
        const state = allowed?.get(value)
        if (!state)
            throw new Error(`No such state [${value}] for this country [${country.name}]`);
        return value;
    }).optional(),
    city: joi.string().custom((value, helpers) => {
        const origin = helpers.state.ancestors[0];
        const {country, state}: RecordType = origin;
        if (!country)
            throw new Error('You should choose country');

        const cities = City.getCitiesOfState(country, state);
        if (!cities.length && !value)
            return value;

        if (cities.find(x=>x.name == value))
            return value;

        throw new Error(`No such city in Country: ${country}, state: ${state}`);
    }).optional(),
    created: joi.date().optional(),
    updated: joi.date().optional(),
});