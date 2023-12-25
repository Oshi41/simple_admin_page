import React, {useCallback, useEffect, useMemo, useState} from "react";
import {FormControl, InputLabel, MenuItem, Stack, TextField} from "@mui/material";
import {City, Country, ICountry, State} from 'country-state-city';
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber';
import InputMask from 'react-input-mask';


type RecordFormProps = {
    source?: Partial<Record>,
};

type Record = {
    name: string,
    phone: string,
    email: string,
    country: string,
    state: string,
    city: string,
};

export function RecordForm(props: RecordFormProps): React.ReactElement {
    const source: Partial<Record> | null = useMemo(() => props.source ? ({...props.source}) : null, [props.source]);
    const is_editing = useMemo(() => !!Object.keys(source || {}).length, [source]);
    const [editing, setEditing] = useState<Partial<Record>>({...source});
    const [email2, setEmail2] = useState('');
    const [errors, setErrors] = useState<Partial<Record & { email2: string }>>({});

    const countries = useMemo(() => Country.getAllCountries(), []);
    const states = useMemo(() => State.getStatesOfCountry(editing.country), [editing.country]);
    const cities = useMemo(() => City.getCitiesOfState(editing.country || '', editing.state || ''),
        [editing.country, editing.state]);

    const phone_mask = useMemo(() => {
        if (!editing.country)
            return '';

        let util = PhoneNumberUtil.getInstance();
        // @ts-ignore
        if (!util.getSupportedRegions().includes(editing.country))
            return '';

        const number = util.getExampleNumber(editing.country || '');
        let format = util.format(number, PhoneNumberFormat.INTERNATIONAL);

        const country_code = '' + number.getCountryCode();
        let index = format.indexOf(country_code);
        if (index >= 0)
            index += country_code.length;
        const mask = format.substring(0, index).replace(/9/g, '\\9')
            + format.substring(index).replace(/\d/g, '9');
        return mask;
    }, [editing.country]);

    const validate = useCallback((strict: boolean) => {
        const errors: Partial<Record & { email2: string }> = {};

        setErrors(errors);
    }, [editing]);

    useEffect(function clear_phone() {
        if (editing.phone) {
            setEditing(prevState => ({
                ...prevState,
                phone: '',
            }));
        }
    }, [editing?.country]);
    useEffect(function validation() {

    }, [editing]);
    return <FormControl component={Stack} direction='column' spacing='8px' padding='12px'>
        <h1>{is_editing ? `Editing ${source?.name} record` : 'Creating new record'}</h1>
        <TextField
            id="field_name"
            label="Name"
            error={!!errors.name}
            value={editing.name}
            onChange={event => {
                setEditing(prevState => ({
                    ...prevState,
                    name: event.target.value,
                }));
            }}
            helperText={errors.name || 'enter your name'}
            variant="standard"
        />
        <TextField
            id="field_country"
            select
            label="Country"
            error={!!errors.country}
            value={editing.country}
            onChange={event => {
                setEditing(prevState => ({
                    ...prevState,
                    country: event.target.value,
                }));
            }}
            helperText={errors.country || 'select country'}
            variant="standard">
            {countries.map(x => <MenuItem key={x.isoCode} value={x.isoCode}>
                {x.name}
            </MenuItem>)}
        </TextField>
        <TextField
            id="field_state"
            select
            label="State"
            disabled={!editing.country || !states.length}
            error={!!errors.state}
            value={editing.state}
            onChange={event => {
                setEditing(prevState => ({
                    ...prevState,
                    state: event.target.value,
                }));
            }}
            helperText={errors.country || 'select state'}
            variant="standard">
            {states.map(x => <MenuItem key={x.isoCode} value={x.isoCode}>
                {x.name}
            </MenuItem>)}
        </TextField>
        <TextField
            id="field_city"
            select
            label="City"
            disabled={!(editing.country && (editing.state || !states.length) && cities.length)}
            error={!!errors.city}
            value={editing.city}
            onChange={event => {
                setEditing(prevState => ({
                    ...prevState,
                    city: event.target.value,
                }));
            }}
            helperText={errors.city || 'select city'}
            variant="standard">
            {cities.map(x => <MenuItem key={x.name} value={x.name}>
                {x.name}
            </MenuItem>)}
        </TextField>

        <InputMask mask={phone_mask}
                   value={editing.phone}
                   disabled={!editing.country}
                   onChange={event => {
                       setEditing(prevState => ({
                           ...prevState,
                           phone: event.target.value,
                       }));
                   }}>
            {
                // @ts-ignore
                () => <TextField
                    label="Phone"
                    error={!!errors.phone}
                    helperText={errors.phone || 'enter your phone'}
                    variant="standard"
                />
            }
        </InputMask>
        <TextField
            id="field_email"
            label="Email"
            error={!!errors.email}
            value={editing.email}
            onChange={event => {
                setEditing(prevState => ({
                    ...prevState,
                    email: event.target.value,
                }));
            }}
            helperText={errors.email || 'enter your email'}
            variant="standard"
        />
        <TextField
            id="field_email2"
            label="Email confirm"
            disabled={!!errors.email || !editing.email}
            error={!!errors.email2}
            value={email2}
            onChange={event => {
                setEmail2(event.target.value);
            }}
            helperText={errors.email2 || 'repeat your email'}
            variant="standard"
        />

    </FormControl>;
}