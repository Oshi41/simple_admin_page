import {Router} from 'express';
import {fn_type, import_lo_dash, mk_err, use_http_fn} from "../utils";
import {db, RecordType} from "../static";
import {ParamsDictionary, Request} from "express-serve-static-core";
import {client_create_validate, client_edit_validate} from "../schema";
import {ParsedQs} from "qs";
// @ts-ignore
import {modify} from '@seald-io/nedb/lib/model'

const _ = import_lo_dash();

const router = Router();
type RecordKeyType = keyof RecordType;
type CustomRequestType = Request<ParamsDictionary, any, any, ParsedQs, Record<string, string>>
    & Partial<{ $set: Partial<RecordType>, $id: Partial<RecordType>, $unset: Partial<RecordType> }>;
type MwFuncType = (req: CustomRequestType) => void;
type HttpFuncType = (req: CustomRequestType) => { result: any };
const pk: string[] = ['phone', 'email', '_id'];
const set_fields: RecordKeyType[] = ['phone', 'name', 'email', 'country', 'state', 'city'];
const unset_fields: RecordKeyType[] = ['state', 'city'];

async function check_db_existence(r: Partial<RecordType>) {
    if (_.isEmpty(r))
        throw mk_err({path: '$id', message: `You should pass ID object to edit`}, 400);

    for (let prop of pk) {
        const value = _.get(r, prop);
        if (value) {
            if (await db.countAsync({[prop]: value}) > 0)
                throw mk_err({path: '$id.' + prop, message: `${prop}=${value} already exists`}, 400);
        }
    }
}

async function validate_post_mw(req: CustomRequestType) {
    let json: Partial<RecordType> = req.body;
    client_create_validate(json, true);
    await check_db_existence(json);
    req.$set = Object.assign(_.pick(json, set_fields), {
        created: new Date(),
        updated: new Date(),
    });
}

async function validate_patch_mw(req: CustomRequestType) {
    const id: Partial<RecordType> = _.pick(req.body?.$id, pk);
    const set: Partial<RecordType> = _.pick(req.body?.$set, set_fields);
    const unset: Partial<RecordType> = _.pick(req.body?.$unset, unset_fields);

    let docs = await db.findAsync(id);
    if (docs.length == 0)
        throw mk_err({path: '$id', message: 'You should pass object ID you want to change'}, 400);
    if (docs.length > 1)
        throw mk_err({path: '$id', message: 'You can change only one item at once'}, 400);


    set.updated = new Date();

    req.$id = docs[0];
    req.$set = set;
    req.$unset = unset;

    const updated: Partial<RecordType> = modify(_.omit(req.$id, ['_id']), {$set: set, $unset: unset});
    client_edit_validate(updated, true);


    for (let prop of pk) {
        const l = _.pick(req.$id, [prop]);
        const r = _.pick(updated, [prop]);

        if (!_.isEmpty(l) && !_.isEmpty(r) && !_.isEqual(l, r)) {
            await check_db_existence(r);
        }
    }
}

router.post('/',
    use_http_fn(validate_post_mw),
    use_http_fn(async (req: CustomRequestType) => {
        if (!req.$set) {
            console.error('You should use validate_post_mw() before');
            throw mk_err('Internal error', 500);
        }
        try {
            const result = await db.insertAsync(req.$set);
            return {result};
        } catch (e) {
            console.error('Error during DB insertion:', e);
            throw mk_err('Internal error', 500);
        }
    }));

router.patch('/',
    use_http_fn(validate_patch_mw),
    use_http_fn(async (req: CustomRequestType) => {
        if (!req.$id || !req.$set && !req.$unset) {
            console.error('You should use validate_patch_mw() before');
            throw mk_err('Internal error', 500);
        }
        try {
            const {numAffected, affectedDocuments} = await db.updateAsync(
                _.pick(req.$id, pk),
                {$set: req.$set, $unset: req.$unset},
                {multi: false, upsert: false, returnUpdatedDocs: true}
            );
            if (numAffected != 1)
                throw new Error('Internal error');
            const result = await db.findOneAsync(_.pick(affectedDocuments, ['_id']));
            return {result};
        } catch (e) {
            console.error('Error during DB insertion:', e);
            throw mk_err('Internal error', 500);
        }
    }));

router.delete('/', use_http_fn(async (req) => {
    const id = _.pick(req.body, pk);
    if (_.isEmpty(id))
        throw mk_err('No primary keys founded', 400);

    const count = await db.countAsync(id);
    if (count > 1)
        throw mk_err('Cannot delete multiple records', 400);
    if (count == 0)
        throw mk_err('ID is not pointing to any record', 400);

    try {
        const rm = await db.removeAsync(id, {multi: false});
        if (rm != 1)
            throw new Error("Internal error");
        return {code: 200};
    } catch (e: any) {
        console.error('Error during remove:', e);
        throw mk_err(e.message || 'Internal error', 500);
    }
}));

export default router;