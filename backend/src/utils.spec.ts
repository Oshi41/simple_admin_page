import {mk_err} from "./utils";
import {deepStrictEqual as de, fail} from 'assert'
import {Country, State, City} from 'country-state-city';

it('mk_err', ()=>{
    let err = mk_err('message', 200);
    de(err.message, 'message');
    de(err.code, 200);
});

// 'AX', 'AS', 'AI', 'AQ', 'AW', 'BV', 'IO',
// 'KY', 'CX', 'CC', 'CK', 'FK', 'FO', 'GF',
// 'PF', 'TF', 'GI', 'GL', 'GP', 'GU', 'GG',
// 'HM', 'JE', 'MO', 'IM', 'MQ', 'YT', 'MS',
// 'BQ', 'NC', 'NU', 'NF', 'MP', 'PS', 'PN',
// 'PR', 'RE', 'SH', 'PM', 'BL', 'MF', 'GS',
// 'SJ', 'TK', 'TC', 'UM', 'VA', 'VG', 'VI',
// 'WF', 'EH', 'CW', 'SX'
it('find countries without state and city', ()=>{
    const result = [];
    const countries = Country.getAllCountries();

    for (let country of countries) {
        const states = State.getStatesOfCountry(country.isoCode);
        if (!states.length)
        {
            const cities = City.getCitiesOfCountry(country.isoCode);
            if (!cities?.length)
                result.push(country);
        }
    }
    console.log(result.map(x=>x.isoCode));
    // console.log(result.map(x=>`[${x.isoCode}] ${x.name}`).join('\n'));
});

// [AL] Albania, [01] Berat County
// [AZ] Azerbaijan, [SAR] Sharur District
// [BS] The Bahamas, [SP] Sandy Point
// [BD] Bangladesh, [33] Bahadia
it('find countries with state without city', ()=>{
    const result = [];
    const countries = Country.getAllCountries();

    for (let country of countries) {
        const states = State.getStatesOfCountry(country.isoCode);
        for (let state of states) {
            const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
            if (!cities?.length)
            {
                result.push({country, state});
            }
        }
    }
    console.log(result.map(x=>`[${x.country.isoCode}] ${x.country.name}, [${x.state.isoCode}] ${x.state.name}`).join('\n'));
});

