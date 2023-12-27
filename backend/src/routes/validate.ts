import {import_lo_dash, mk_err, use_http_fn} from "../utils";
import {Router} from 'express';
import {RecordType, db} from "../static";
import {schema, client_edit_validate, client_create_validate} from '../schema';

const _ = import_lo_dash();
const router = Router();

type record_type_keys = keyof RecordType;
const primary_keys: record_type_keys[] = ['phone', 'email'];

router.post('/create', use_http_fn(async (req, res) => {
    const {full} = req.query;
    const r: Partial<RecordType & { email2: string }> = req.body;
    client_create_validate(r, !!full);

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

    client_edit_validate(upd, !!full);

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
