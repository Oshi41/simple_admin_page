import React, {useCallback, useEffect, useMemo, useState} from "react";
import {client_create_validate, client_edit_validate, RecordType} from "../schema";
import {
    Button, CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    MenuItem,
    Stack,
    TextField
} from "@mui/material";
import _ from 'lodash';
import {City, Country, State} from "country-state-city";
import {PhoneNumberFormat, PhoneNumberUtil} from "google-libphonenumber";
import InputMask from 'react-input-mask';
import {CustomDialog, DialogContentProps} from "../contorls/CustomDialog";
import {TableData, edit_record, create_record} from "../fetch";

type EditType = Omit<RecordType, 'created' | 'updated'> & { email2: string };
type EditErrorsType = Partial<Omit<RecordType, 'created' | 'updated'> & { email2: string }>;

type RecordFormProps = {
    source?: RecordType,
    go_to: (path: string, q?: { [key: string]: string }) => void,
    on_confirm: (args: TableData) => void,
};

export function RecordForm(props: RecordFormProps) {
    let {on_confirm, source, go_to} = props;

    const is_editing = useMemo(() => !_.isEmpty(source), [source]);
    const [pending, set_pending] = useState<EditType>();
    const go_back = useCallback(() => go_to('/all'), [go_to]);
    const [errors, set_errors] = useState<EditErrorsType>();
    const full_filled = useMemo(() => {
        if (!pending)
            return false;

        const all_keys: (keyof EditType)[] = ['phone', 'name', 'email', 'country'];
        if (!is_editing)
            all_keys.push('email2');
        const res = all_keys.every(x => !!pending?.[x]);
        return res;
    }, [pending]);
    const [dialog_content, set_dialog_content] = useState<DialogContentProps>()

    const countries = useMemo(Country.getAllCountries, []);
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

    const change_field_fn = useCallback((prop: keyof EditType) => {
        return function (e: React.ChangeEvent<HTMLInputElement>) {
            const value = e.target.value;
            set_pending(prev => {
                const result = _.cloneDeep(prev) as EditType;
                result[prop] = value;
                if (prop == 'country') {
                    const origin_country = value == source?.country;
                    result.phone = origin_country && source?.phone || '';
                    result.state = origin_country && source?.state || '';
                    result.city = origin_country && source?.city || '';
                }
                if (prop == 'state') {
                    const origin_state = value == source?.state;
                    result.city = origin_state && source?.city || '';
                }
                return result as EditType;
            });
        }
    }, [source, set_pending]);
    const can_apply = useMemo(() => {
        if (!full_filled || !_.isEmpty(errors))
            return false;

        const fields_to_compare = ['name', 'phone', 'email', 'email2', 'country', 'state', 'city',];
        const left = _.pick(source, fields_to_compare);
        const right = _.pick(pending, fields_to_compare);
        return !_.isEqual(left, right);
    }, [pending, errors, full_filled]);

    const on_apply = useCallback(() => {
        set_dialog_content({type: 'loading'});

        // @ts-ignore
        (is_editing ? edit_record(source, pending) : create_record(pending))
            .then((x: TableData) => {
                set_dialog_content({
                    type: 'success',
                    label: (is_editing ? 'Editing' : 'Creating') + ' record success',
                    content: 'Record was ' + (is_editing ? 'updated' : 'created'),
                    buttons: {
                        ok: {
                            label: 'Proceed',
                            disabled: false,
                            on_click: () => {
                                go_to('/all', {sel: pending?.email || ''});
                                set_dialog_content(undefined);
                                pending && on_confirm(x);
                            },
                        },
                    },
                });
            }).catch((e: any) => {
            if (['name', 'phone', 'email', 'email2', 'country', 'state', 'city'].includes(e.path)) {
                set_errors({[e.path]: e.message});
                set_dialog_content(undefined);
            } else {
                set_dialog_content({
                    type: 'error',
                    label: 'Server error',
                    content: e.message,
                    buttons: {cancel: {on_click: () => set_dialog_content(undefined),}},
                    click_away: () => set_dialog_content(undefined),
                });
            }
        });
    }, [pending, on_confirm, source]);

    // @ts-ignore
    useEffect(() => {
        // @ts-ignore
        set_pending(_.pick(source || {}, ['country', 'state', 'city', 'phone', 'email', 'name']));
    }, [source]);
    useEffect(function validate() {
        if (!pending)
            return;

        const validate_fn = is_editing ? client_edit_validate : client_create_validate;
        const errors: Partial<EditErrorsType> = {};
        try {
            validate_fn({...pending}, full_filled);
        } catch (e: any) {
            if (e?.result) {
                // @ts-ignore
                errors[e.result.path] = e.result.message;
            }
        } finally {
            set_errors(errors);
        }
    }, [pending, full_filled]);

    return <>
        {CustomDialog(dialog_content)}
        <Dialog open={true}
                onClose={go_back}>
            <DialogTitle>
                {is_editing ? 'Editing record' : 'Creating record'}
            </DialogTitle>

            <DialogContent>
                <FormControl component={Stack} direction='column' spacing='8px' width={'400px'}>
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
                        disabled={!pending?.country || !cities.length}
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
            </DialogContent>

            <DialogActions>
                <Stack direction={'row'} spacing={'8px'}>
                    <Button onClick={go_back}>Cancel</Button>
                    <Button variant={'contained'}
                            disabled={!can_apply || _.isEmpty(pending)}
                            onClick={() => pending && on_apply()}>
                        Confirm
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    </>;
}