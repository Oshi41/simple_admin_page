import {Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState} from "react";

/** Hook to listen URL changes*/
export const useLocation = (): [URL, Dispatch<SetStateAction<URL>>] => {
    const href = window.location.href;
    const url = useMemo<URL>(() => new URL(href), [href]);
    const set_url: Dispatch<SetStateAction<URL>> = useCallback(prevState => {
        const old = new URL(window.location.href);
        const updated = typeof prevState == 'function'
            ? prevState(new URL(old.toString())) : prevState;
        if (updated.toString() == url.toString())
            return;
        window.history.pushState({url: updated.toString()}, '', updated);
    }, [window.location.href, window.history]);
    useEffect(() => {
        console.log('Upd', href);
    }, [href]);
    return [url, set_url];
};

/**
 * Manage single query param
 * @param name - query parameter name
 * @param default_value - default string value
 */
const useQParam = (name: string, default_value: string): [string, Dispatch<SetStateAction<string>>] => {
    const [url, set_url] = useLocation();
    useState();
    const value = useMemo(() => getQParam(name) || '', [url]);
    const setValue: Dispatch<SetStateAction<string>> = useCallback(qparam => {
        const updated = typeof qparam == 'function' ? qparam(value) : qparam;
        set_url(prevState => {
            prevState.searchParams.set(name, updated);
            return new URL(prevState.toString());
        });
    }, [value, url, set_url]);
    useEffect(() => void (!value && setValue(default_value)), [default_value]);
    return [value, setValue];
};

/**
 * Returns value of q param
 * @param name name of URL query parameter
 */
export const getQParam = (name: string): string | null => {
    let url = new URL(window.location.toString());
    return url.searchParams.get(name);
};
export const setQParam = (name: string, val?: string) => {
    let url = new URL(window.location.href);
    if (val)
        url.searchParams.set(name, val);
    else
        url.searchParams.delete(name);

    if (url.toString() == window.location.href)
        return;

    window.history.pushState({url: url.toString()}, '', url);
}