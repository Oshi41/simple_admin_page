import {Box, FormControl, MenuItem, Stack, TextField} from "@mui/material";
import {client_create_validate, client_edit_validate, RecordType} from "../schema";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import _ from "lodash";
import {City, Country, ICity, ICountry, IState, State} from "country-state-city";
import {PhoneNumber, PhoneNumberFormat, PhoneNumberUtil} from "google-libphonenumber";
import InputMask from 'react-input-mask';

type editSourceType = RecordType & {
    _phone?: PhoneNumber,
    _location?: [ICountry | undefined, IState | undefined, ICity | undefined],
};
type editRecordType = {
    name: string,
    phone: string,
    email: string,
    country: string,
    state?: string,
    city?: string,
};
type editRecordTypeKey = keyof editRecordType;

type createRecordType = editRecordType & {
    email2: string,
};
type createRecordKey = keyof createRecordType;

type createRecordErrType = {
    name: string,
    phone: string,
    email: string,
    email2: string,
    country: string,
    state: string,
    city: string,
    created: string,
    updated: string,
};

type RecordFormProps = {
    source?: Partial<editSourceType>,
    go_to: (path: string) => void,
};

type validateError = {
    path: keyof createRecordErrType,
    message: string,
};

const countries = Country.getAllCountries();

export function RecordForm(props: RecordFormProps) {
    let {source} = props;
    const is_editing = useMemo(() => !_.isEmpty(source), [source]);
    const [pending, set_pending] = useState<Partial<createRecordType>>();
    const [errors, set_errors] = useState<Partial<createRecordErrType>>();
    useEffect(function set_from_source() {
        if (_.isEmpty(source))
            set_pending({});
        else {
            const upd = {
                ..._.pick(source, ['name', 'email', 'phone']),
                country: source._location?.[0]?.isoCode || source.country,
                state: source._location?.[1]?.isoCode || source.state,
                city: source._location?.[2]?.name || source.city,
            };
            console.log('Country:', upd.country);
            set_pending(upd);
        }
        set_errors({});
    }, [source]);
    useEffect(function validate() {
        if (!pending)
            return;

        const all_keys: createRecordKey[] = ['phone', 'name', 'email', 'country'];
        if (!is_editing)
            all_keys.push('email2');

        const fullfilled = all_keys.every(x => !!pending?.[x]);
        const validate_fn = is_editing ? client_edit_validate : client_create_validate;

        const errors: Partial<createRecordErrType> = {};
        try {
            validate_fn(pending, fullfilled);
        } catch (e: any & validateError) {
            if (e?.result) {
                // @ts-ignore
                errors[e.result.path] = e.result.message;
            }
        } finally {
            set_errors(errors);
        }
    }, [pending]);

    const change_field_fn = useCallback((prop: keyof createRecordType) => {
        return function (e: React.ChangeEvent<HTMLInputElement>) {
            const value = e.target.value;
            set_pending(prev => {
                return {
                    ...prev,
                    [prop]: value,
                };
            });
        }
    }, []);
    const states = useMemo(() => State.getStatesOfCountry(pending?.country || '') || [],
        [pending?.country]);
    const cities = useMemo(() => City.getCitiesOfState(pending?.country || '', pending?.state || ''),
        [pending?.country, pending?.state]);
    const phone_mask = useMemo(() => {
        if (!pending?.country)
            return '';

        let util = PhoneNumberUtil.getInstance();
        // @ts-ignore
        if (!util.getSupportedRegions().includes(pending?.country))
            return '';

        const number = util.getExampleNumber(pending?.country || '');
        let format = util.format(number, PhoneNumberFormat.INTERNATIONAL);

        const country_code = '' + number.getCountryCode();
        let index = format.indexOf(country_code);
        if (index >= 0)
            index += country_code.length;
        const mask = format.substring(0, index).replace(/9/g, '\\9')
            + format.substring(index).replace(/\d/g, '9');
        return mask;
    }, [pending?.phone]);

    return <Box sx={{display: 'flex', justifyContent: 'center', margin: '24px'}}>
        <FormControl component={Stack} direction='column' spacing='8px' padding='12px'>
            <h2>{is_editing ? `Editing ${source?.name} record` : 'Creating new record'}</h2>
            <TextField
                id="f_name"
                label="Name"
                error={!!errors?.name && !!pending?.name}
                value={pending?.name || ''}
                onChange={change_field_fn('name')}
                helperText={errors?.name || 'enter your name'}
                variant="standard"
            />
            <TextField
                id="f_email"
                label="Email"
                error={!!errors?.email && !!pending?.email}
                value={pending?.email || ''}
                onChange={change_field_fn('email')}
                helperText={errors?.email || 'enter your email'}
                variant="standard"
            />
            {!is_editing &&
                <TextField
                    id="f_email"
                    label="Repeate email"
                    error={!!errors?.email2 && !!pending?.email2}
                    value={pending?.email2 || ''}
                    onChange={change_field_fn('email2')}
                    helperText={errors?.email2 || 'confirm your email'}
                    variant="standard"
                />
            }
            <TextField
                id="f_country"
                select
                label="Country"
                error={!!errors?.country && !!pending?.country}
                value={pending?.country || ''}
                onChange={change_field_fn('country')}
                helperText={errors?.country || 'select country'}
                variant="standard">
                {countries.map(x => <MenuItem key={x.isoCode} value={x.isoCode}>
                    {x.name}
                </MenuItem>)}
            </TextField>
            <TextField
                id="f_state"
                select
                label="State"
                disabled={!pending?.country || !states.length}
                error={!!errors?.state && !!pending?.state}
                value={pending?.state || ''}
                onChange={change_field_fn('state')}
                helperText={errors?.state || 'select state'}
                variant="standard">
                {states.map(x => <MenuItem key={x.isoCode} value={x.isoCode}>
                    {x.name}
                </MenuItem>)}
            </TextField>
            <TextField
                id="f_city"
                select
                label="City"
                disabled={!pending?.city || !cities.length}
                error={!!errors?.city && !!pending?.city}
                value={pending?.city || ''}
                onChange={change_field_fn('city')}
                helperText={errors?.city || 'select city'}
                variant="standard">
                {cities.map(x => <MenuItem key={x.name} value={x.name}>
                    {x.name}
                </MenuItem>)}
            </TextField>
            <InputMask mask={phone_mask}
                       value={pending?.phone || ''}
                       disabled={!pending?.country}
                       onChange={change_field_fn('phone')}>
                {
                    // @ts-ignore
                    () => <TextField
                        label="Phone"
                        error={!!errors?.phone && !!pending?.phone}
                        helperText={errors?.phone || 'enter your phone'}
                        variant="standard"
                    />
                }
            </InputMask>
        </FormControl>
    </Box>;
}