import React, {useMemo} from "react";
import {Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle} from "@mui/material";
import _ from 'lodash';
import {ButtonOwnProps, ButtonTypeMap} from "@mui/material/Button/Button";

type ButtonType = {
    label?: string,
    disabled?: boolean,
    on_click?: () => void,
}

export type DialogContentProps = {
    type: string | 'loading',
    label?: string,
    content?: string | React.ReactElement,
    click_away?: () => void,
    buttons?: {
        ok?: ButtonType,
        cancel?: ButtonType,
    },
}

export function CustomDialog(props?: DialogContentProps) {
    const is_open = !_.isEmpty(props);
    let {content, label, type, buttons} = props || {};
    const d_label = useMemo(() => {
        return label
            || type == 'loading' && 'Loading...'
            || '';
    }, [label, type]);
    const d_content = useMemo(() => {
        return content
            || type == 'loading' && <CircularProgress/>
            || '';
    }, [content, type]);
    const d_buttons: (ButtonOwnProps & { label: string })[] = useMemo(() => {
        return [buttons?.cancel, buttons?.ok]
            .filter(x => !_.isEmpty(x))
            .map(x => ({
                variant: x == buttons?.ok ? 'contained' : undefined,
                onClick: () => x?.on_click?.(),
                disabled: x?.hasOwnProperty('disabled') ? x?.disabled : false,
                label: x?.label
                    || (x == buttons?.ok && 'Confirm')
                    || (x == buttons?.cancel && 'Cancel')
                    || '',
            }));
    }, [buttons]);

    return <Dialog open={is_open}
                   onClose={() => {
                       [props?.click_away, buttons?.cancel?.on_click]
                           .find(f=>typeof f == 'function')?.();
                   }}>
        <DialogTitle>{d_label}</DialogTitle>
        <DialogContent sx={{display: 'flex', justifyContent: 'center'}}>{d_content}</DialogContent>
        {d_buttons?.length ?
            <DialogActions>
                {d_buttons.map(x => <Button {...x}>{x.label}</Button>)}
            </DialogActions>
            : <></>
        }
    </Dialog>
}