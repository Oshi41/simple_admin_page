import {import_lo_dash, mk_err, use_http_fn} from "../utils";
import {Router} from 'express';
import {RecordType, db} from "../static";
import {schema} from '../schema';

const _ = import_lo_dash();
const router = Router();

type record_type_keys = keyof RecordType;
const primary_keys: record_type_keys[] = ['phone', 'email'];

router.post('/create', use_http_fn(async (req, res) => {
    const {full} = req.query;
    const r: Partial<RecordType & { email2: string }> = req.body;
    if (r.email && r.email2 && r.email2 !== r.email)
        throw mk_err({path: 'email2', message: `Emails do not match`}, 400,);
    if (full && !r.email2)
        throw mk_err({path: 'email2', message: `You should confirm email`}, 400,);

    // remove due to next checks
    delete r.email2;

    const validate_res = schema.validate(r, {
        presence: full ? 'required' : 'optional',
    });
    if (validate_res.error) {
        let {context, message, path, type} = validate_res.error.details[0];
        throw mk_err({path: path.shift(), type, message}, 400);
    }

    if (full)
    {
        for (let prop of primary_keys) {
            if (await db.countAsync({[prop]: r[prop]}) > 0)
                throw mk_err({path: prop, message: `Already exists`}, 400,);
        }
    }

    return {code: 200};
}));

router.post('/edit', use_http_fn(async (req, res) => {
    const {full} = req.query;
    const old: Partial<RecordType> = req.body?.old;
    const upd: Partial<RecordType> = req.body?.upd;

    if (!old.email)
        throw mk_err({path: 'old.email', message: 'You should pass old email value'}, 400);
    if (!old.phone)
        throw mk_err({path: 'old.phone', message: 'You should pass old phone value'}, 400);

    const validate_res = schema.validate(upd, {
        presence: full ? 'required' : 'optional',
    });
    if (validate_res.error) {
        let {context, message, path, type} = validate_res.error.details[0];
        throw mk_err({path: path.shift(), type, message}, 400);
    }

    if (full)
    {
        if (old.email != upd.email && await db.countAsync({email: upd.email}) > 0)
            throw mk_err({path: 'email', message: `Already exists`}, 400,);

        if (old.phone != upd.phone && await db.countAsync({phone: upd.phone}) > 0)
            throw mk_err({path: 'phone', message: `Already exists`}, 400,);
    }

    return {code: 200};
}))

export default router;
