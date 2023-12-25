import {Router} from 'express';
import {import_lo_dash, mk_err, use_http_fn} from "../utils";
import {db, RecordType, schema} from "../static";
import {RequestHandler} from "express-serve-static-core";
import {Document} from "@seald-io/nedb";

const _ = import_lo_dash();

const router = Router();

router.post('/', use_http_fn(async (req, res) => {
    let json = req.body as Partial<RecordType>;
    try {
        json = await schema.validateAsync(json);
    } catch (e: any & Error) {
        throw mk_err(e.message, 400);
    }
    let ids = [
        _.pick(json, ['email']),
        _.pick(json, ['phone']),
    ];
    ids = await Promise.all(ids.map(x => db.countAsync(x)));
    if (ids.some(x => x > 0))
        throw mk_err('Such email/phone is already exists', 400);

    json.created = new Date();
    json.updated = new Date();
    let result = await db.insertAsync(json);
    return {result};
}));
router.patch('/', use_http_fn(async (req, res) => {
    const id = _.pick(req.body?.prev || {}, ['email', 'phone']);
    const patch = _.pick(req.body?.patch || {}, ['name', 'phone', 'email', 'country', 'state']);
    const count = await db.countAsync(id);
    if (count == 0)
        throw mk_err('There is no record to modify');
    if (count > 1)
        throw mk_err('Trying to edit too many records');

    const doc = await db.findOneAsync(id);
    let result = {...doc, ...patch};
    try {
        result = await schema.validateAsync(result);
    } catch (e: Error & any) {
        throw mk_err(e.message, 400);
    }

    result.updated = new Date();
    try {
        const {numAffected} = await db.updateAsync(id, {$set: _.omit(result, ['_id'])}, {multi: false, upsert: false});
        if (numAffected != 1)
            throw mk_err('Internal error', 500);
    } catch (e: Error & any) {
        throw mk_err(e.message, 400);
    }

    return {result};
}));
router.delete('/', use_http_fn(async (req, res) => {
    const id = _.pick(req.body, ['_id', 'email', 'phone']);
    const count = await db.countAsync(id);
    if (count == 0)
        throw mk_err('There is no record to modify');
    if (count > 1)
        throw mk_err('Trying to edit too many records');

    const removed = await db.removeAsync(id, {multi: false});
    if (removed != 1)
        throw mk_err('Internal error', 500);

    return {code: 200};
}));

export default router;