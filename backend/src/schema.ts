import joi from "joi";
import {PhoneNumberUtil} from "google-libphonenumber";
import {Country, ICountry, State, City, ICity} from "country-state-city";
import {mk_err} from "./utils";

const countries: Map<string, ICountry> = new Map(Country.getAllCountries().map(x => [x.isoCode, x]));
const states = new Map(Array.from(countries.values()).map(x => [x, new Map(State.getStatesOfCountry(x.isoCode).map(x => [x.isoCode, x]))]));

export type RecordType = {
    name: string,
    phone: string,
    email: string,
    country: string,
    state: string,
    city: string,
    created: Date,
    updated: Date,
}

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

        if (cities.find(x => x.name == value))
            return value;

        throw new Error(`No such city in Country: ${country}, state: ${state}`);
    }).optional(),
    created: joi.date().optional(),
    updated: joi.date().optional(),
});

export type CreateRecord = Partial<RecordType & { email2: string }>;

function validate_location(r: Partial<Pick<RecordType, 'country' | 'state' | 'city'>>) {
    if (!r.country)
        throw mk_err({path: 'country', message: `You must select your country`}, 400,);

    const country = Country.getCountryByCode(r.country);
    if (!country)
        throw mk_err({path: 'country', message: `Unknown country: ${r.country}`}, 400,);

    const country_states = State.getStatesOfCountry(country.isoCode);
    if (country_states.length) {
        if (!r.state)
            throw mk_err({path: 'state', message: `You must select your state`}, 400,);

        if (!country_states.find(x => x.isoCode == r.state))
            throw mk_err({path: 'state', message: `Unknown state: [ISO] ${r.state}`}, 400,);
    }
    const cities = City.getCitiesOfCountry(country.isoCode);
    if (cities?.length)
    {
        if (!country_states.length && !r.city)
            throw mk_err({path: 'city', message: `You can skip state but must select your city`}, 400,);

        let possible_cities: ICity[] = cities;
        if (r.state)
            possible_cities = possible_cities.filter(x=>x.stateCode == r.state);

        // can select at least one city
        if (possible_cities.length)
        {
            if (!possible_cities.find(x=>x.name == r.city))
                throw mk_err({path: 'city', message: `You must select your city`}, 400,);
        }
    }
}

/**
 * Validate create object. Returns true if ok, throws error in other cases
 * @param obj - record to validate
 * @param strict - checks all fields in strict mode (before apply check)
 * @throws Error - if check goes wrong
 */
export function client_create_validate(obj: CreateRecord, strict: boolean = false) {
    if (obj.email2 && obj.email && obj.email2 !== obj.email)
        throw mk_err({path: 'email2', message: `Emails do not match`}, 400,);

    if (strict && !obj.email2)
        throw mk_err({path: 'email2', message: `You should confirm email`}, 400,);

    // remove field for creating only
    delete obj.email2;
    return client_edit_validate(obj, strict);
}


/**
 * Validates edit object. Return true otherwise throws an error
 * @param obj - edit object info
 * @param strict - checks all fields in strict mode (before apply check)
 * @throws Error - if check goes wrong
 */
export function client_edit_validate(obj: Partial<RecordType>, strict: boolean = false) {
    const validate_res = schema.validate(obj, {
        presence: strict ? 'required' : 'optional',
    });
    if (validate_res.error) {
        let {message, path, type} = validate_res.error.details[0];
        throw mk_err({path: path.shift(), type, message}, 400);
    }
    if (strict)
        validate_location(obj);
    return true;
}