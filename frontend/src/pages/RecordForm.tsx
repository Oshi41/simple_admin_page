import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
    Box,
    Button,
    CircularProgress,
    Dialog, DialogActions,
    DialogContent, DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Stack,
    TextField, Typography
} from "@mui/material";
import {City, Country, ICountry, State} from 'country-state-city';
import {PhoneNumberFormat, PhoneNumberUtil} from 'google-libphonenumber';
import InputMask from 'react-input-mask';
import {client_edit_validate, client_create_validate, RecordType} from '../schema';
import {Simulate} from "react-dom/test-utils";
import {useLocation} from "../hooks";

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

type DialogContent = {
    type: 'error' | 'patched' | 'deleted' | 'created' | 'loading' | 'delete_confirm',
    message?: string,
    record?: Partial<Record>,
};

export function RecordForm(props: RecordFormProps): React.ReactElement {
    const source: Partial<Record> | null = useMemo(() => props.source ? ({...props.source}) : null, [props.source]);
    const is_editing = useMemo(() => !!Object.keys(source || {}).length, [source]);
    const [editing, setEditing] = useState<Partial<Record>>({...source});
    const [email2, setEmail2] = useState('');
    const [dialog_content, set_dialog_content] = useState<DialogContent | null>(null);
    const [url, setUrl] = useLocation();

    const countries = useMemo(() => Country.getAllCountries(), []);
    const states = useMemo(() => State.getStatesOfCountry(editing.country), [editing.country]);
    const cities = useMemo(() => City.getCitiesOfState(editing.country || '', editing.state || ''),
        [editing.country, editing.state]);

    const [server_errors, set_server_errors] = useState({});

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
    const errors: Partial<Record & { email2: string, fulfilled: boolean }> = useMemo(() => {
        const validate_fn = is_editing ? client_edit_validate : client_create_validate;
        const _errors: Partial<Record & { email2: string, fulfilled: boolean }> = {};
        type t = keyof RecordType;
        // assuming this key as required for strict check
        const all_keys: t[] = ['name', 'country', 'phone', 'email'];
        // @ts-ignore
        let fullfilled = all_keys.every(x => !!editing[x]);
        if (is_editing)
            fullfilled &&= !!email2;
        try {
            const to_check = {...editing};
            if (!is_editing)
                // need to extend editing object with email2 property for creating record check
                Object.assign(to_check, {email2});
            validate_fn(to_check, fullfilled);
        } catch (e: any & { result: { path: t, message: string } }) {
            // @ts-ignore
            _errors[e.result.path] = e.result.message;
        }
        if (!fullfilled)
            _errors.fulfilled = false;

        // copy server side errors
        Object.assign(_errors, server_errors);
        return _errors;
    }, [editing, email2, server_errors]);
    const apply = useCallback(async () => {
        if (is_editing) {
            const $id = {email: source?.email};
            const $set = {...editing};
            type t = keyof RecordType;
            const unset_fields: t[] = ['state', 'city'];
            // @ts-ignore
            const $unset = unset_fields.map(x => [x, $set[x]]).filter(x => !x[1])
                .reduce((p, c) => Object.assign(p, {[c[0]]: 1}), {});
            set_dialog_content({type: 'loading'});

            try {
                const result = await fetch('/record', {
                    method: 'PATCH',
                    body: JSON.stringify({$id, $set, $unset}),
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                if (!result.ok) {
                    try {
                        const {path, message} = await result.json();
                        if (path == '$id')
                            set_dialog_content({type: 'error', message});
                        else
                            set_server_errors({[path]: message,});
                    } catch (e) {
                        const message = await result.text();
                        set_dialog_content({type: 'error', message});
                    }
                } else {
                    set_dialog_content({
                        type: 'patched',
                        message: 'Record was successfully updated',
                        record: editing,
                    });
                }

            } catch (e: any & Error) {
                console.error("Err during record patch:", e);
                set_dialog_content({type: 'error', message: e.message});
            }
        }
    }, [errors, editing]);

    useEffect(function clear_phone() {
        if (editing.phone) {
            setEditing(prevState => ({
                ...prevState,
                phone: '',
            }));
        }
    }, [editing?.country]);
    useEffect(function on_source_changed() {
        setEditing({...(source || {})});
    }, [source]);

    const dialog_title = useMemo(() => {
        switch (dialog_content?.type || '') {
            case "created":
                return 'Successfully created';

            case "deleted":
                return 'Successfully deleted';

            case "patched":
                return 'Successfully edited';

            case "error":
                return 'Error';

            case "loading":
                return 'Loading...';

            default:
                return '';
        }
    }, [dialog_content?.type]);
    const confirm_button_text = useMemo(() => {
        switch (dialog_content?.type || '') {
            case "created":
            case "patched":
            case "deleted":
                return 'Go back to records list';

            case "error":
                return 'Close';

            default:
                return '';
        }
    }, [dialog_content?.type]);

    const on_change_fn = useCallback((prop: string) => {
        return function on_change(e: React.ChangeEvent<HTMLInputElement>) {
            const updated = e.target.value;
            setEditing(prevState => {
                return {
                    ...prevState,
                    [prop]: updated,
                };
            });
            set_server_errors(prevState => {
                const result = {...(prevState || {})};
                // @ts-ignore
                delete result[prop];
                return result;
            });
        }
    }, [setEditing, set_server_errors]);

    return <Box sx={{display: 'flex', justifyContent: 'center', margin: '24px'}}>
        <Dialog open={!!dialog_content}>
            <DialogTitle><h3>{dialog_title}</h3></DialogTitle>
            <DialogContent>
                <Stack alignItems='center' direction='column'>
                    {dialog_content?.type == 'loading' && <CircularProgress/>}
                    {dialog_content?.type == 'error' && <Typography>{dialog_content.message}</Typography>}
                </Stack>
            </DialogContent>
            {dialog_content?.type && dialog_content.type != 'loading' &&
                <DialogActions>
                    <Button onClick={() => {
                        set_dialog_content(null);
                        if (dialog_content?.record)
                            setUrl(prevState => {
                                prevState.pathname = '/all';
                                if (dialog_content.record) {
                                    prevState.searchParams.set('sel', dialog_content.record.email || '');
                                }
                                return prevState;
                            })
                    }}>{confirm_button_text}</Button>
                </DialogActions>
            }
        </Dialog>
        <FormControl component={Stack} direction='column' spacing='8px' padding='12px'>
            <h1>{is_editing ? `Editing ${source?.name} record` : 'Creating new record'}</h1>
            <TextField
                id="field_name"
                label="Name"
                error={!!errors.name && !!editing.name}
                value={editing.name}
                onChange={on_change_fn('name')}
                helperText={errors.name || 'enter your name'}
                variant="standard"
            />
            <TextField
                id="field_country"
                select
                label="Country"
                error={!!errors.country && !!editing.country}
                value={editing.country}
                onChange={on_change_fn('country')}
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
                error={!!errors.state && !!editing.state}
                value={editing.state}
                onChange={on_change_fn('state')}
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
                error={!!errors.city && !!editing.city}
                value={editing.city}
                onChange={on_change_fn('city')}
                helperText={errors.city || 'select city'}
                variant="standard">
                {cities.map(x => <MenuItem key={x.name} value={x.name}>
                    {x.name}
                </MenuItem>)}
            </TextField>

            <InputMask mask={phone_mask}
                       value={editing.phone}
                       disabled={!editing.country}
                       onChange={on_change_fn('phone')}>
                {
                    // @ts-ignore
                    () => <TextField
                        label="Phone"
                        error={!!errors.phone && !!editing.phone}
                        helperText={errors.phone || 'enter your phone'}
                        variant="standard"
                    />
                }
            </InputMask>
            <TextField
                id="field_email"
                label="Email"
                error={!!errors.email && !!editing.email}
                value={editing.email}
                onChange={on_change_fn('email')}
                helperText={errors.email || 'enter your email'}
                variant="standard"
            />
            <TextField
                id="field_email2"
                label="Email confirm"
                disabled={!!errors.email || !editing.email}
                error={!!errors.email2 && !!email2}
                value={email2}
                onChange={event => {
                    setEmail2(event.target.value);
                    set_server_errors(prevState => {
                        const result = {...prevState || {}};
                        // @ts-ignore
                        delete result.email2;
                        return result;
                    })
                }}
                helperText={errors.email2 || 'repeat your email'}
                variant="standard"
            />
            <Button variant='contained'
                    disabled={!!Object.keys(errors).length || !!dialog_content}>
                {is_editing ? 'Apply' : 'Create'}
            </Button>

        </FormControl>
    </Box>;
}