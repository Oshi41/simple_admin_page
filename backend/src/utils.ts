import {
    NextFunction,
    ParamsDictionary,
    Request,
    RequestHandler,
    Response
} from "express-serve-static-core";
import {ParsedQs} from "qs";
import _, {LoDashStatic} from 'lodash';


type handler_res = undefined | { result?: any, code?: number };
type fn_type<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = ParsedQs,
    LocalsObj extends Record<string, any> = Record<string, any>,
> = (req: Request<P, ResBody, ReqBody, ReqQuery, LocalsObj>,
     res: Response<ResBody, LocalsObj>,
     next: NextFunction) => undefined | handler_res | Promise<undefined | handler_res>;

export function use_http_fn(fn: fn_type): RequestHandler {
    return async (req, res, next) => {
        try {
            let {result, code} = await fn(req, res, next) || {};
            if (result)
                return res.status(code || 200).json(result);
            else if (Number.isInteger(code))
                return res.sendStatus(code || 200);
            else
                return next?.();
        } catch (e: any & Error) {
            console.debug('Error during request:', req.url, e);
            return Number.isInteger(e.code) ? res.status(e.code).send(e.message)
                : res.status(500).send('Internal error');
        }
    };
}

export function mk_err(message: string, code: number = 400): Error & { code: number } {
    return Object.assign(new Error(message), {code});
}


interface LoDash extends LoDashStatic {
    pick: (obj: any, fields: string[]) => any,
}
export function import_lo_dash(): LoDash {
    return _ as LoDash;
}