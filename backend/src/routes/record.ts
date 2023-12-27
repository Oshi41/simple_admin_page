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

    const ids = new Set();
    for (let prop of pk) {
        const value = _.get(r, prop);
        if (value) {
            const docs = await db.findAsync({[prop]: value}, {_id: 1});
            docs.forEach(x => ids.add(x));
        }
    }

    if (ids.size > 0)
        throw mk_err({path: '$id', message: `ID pointing on multiple documents`}, 400);
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
    client_edit_validate(updated);

    for (let prop of pk) {
        const l = _.pick(req.$id, [prop]);
        const r = _.pick(updated, [prop]);

        if (!_.isEmpty(l) && !_.isEmpty(r) && !_.eq(l, r)) {
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

//
// /**
//  * Validates creation object, checks DB insertion possibility
//  */
// const validate_creation_mw: fn_type = async (req, res, next) => {
//     let json = req.body as Partial<RecordType>;
//     client_create_validate(json, true);
//
//     for (let prop of pk) {
//         if (await db.countAsync({[prop]: json[prop]}) > 0)
//             throw mk_err({path: prop, message: json[prop] + ' already exists'}, 400);
//     }
//
//     json.created = new Date();
//     json.updated = new Date();
// };
// /**
//  * Validates old object id and look it up in DB
//  */
// const validate_old_mw: MwFuncType = async (req) => {
//     let json = req.body?.$id as Partial<RecordType>;
//     let id = _.pick(json, pk);
//     const doc: RecordType[] = await db.findAsync(id);
//     if (doc.length != 1)
//         throw mk_err({path: 'old', message: 'old must be id of single record'}, 400);
//     req._source = doc[0];
// };
//
// const validate_upd_mw: MwFuncType = async (req) => {
//     const source = req._source;
//     if (!source)
//     {
//         console.warn('Looks like validate_old_mw was not called');
//         throw mk_err({path: 'old', message: 'You should pass editing object ID'}, 400);
//     }
//
//     const $set: Partial<RecordType> = req.body?.$set;
//     const $unset: Partial<RecordType> = req.body?.$unset;
//     const patch = {$set, $unset};
//
//     const patched_version = modify(req.body.upd, patch);
//
//     // if (!req.body)
//     //     throw mk_err({path: 'upd', message: 'You should pass changes you need to make'}, 400);
//     //
//     // const can_set: RecordKeyType[] = ['name', 'phone', 'email', 'country', 'state', 'city'];
//     // const can_unset: RecordKeyType[] = ['state', 'city'];
//     //
//     // const $set: Partial<RecordType> = {}, $unset: Partial<RecordType> = {};
//     // for (let prop of new Set([...can_set, ...can_unset]))
//     // {
//     //     let value = req.body?.upd?.[prop];
//     //     if (!value && can_unset.includes(prop))
//     //         $unset[prop] = value;
//     //     if (!!value)
//     //         $set[prop] = value;
//     // }
//     //
//     // $set.created = new Date();
//     // client_edit_validate($set);
//     req._patch = {$set, $unset};
// };
//
//
// router.post('/', use_http_fn(validate_creation_mw), use_http_fn(async (req, res) => {
//     let json = req.body as Partial<RecordType>;
//     let result = await db.insertAsync(json);
//     return {result};
// }));
// router.patch('/',
//     use_http_fn(validate_old_mw),
//     use_http_fn(validate_upd_mw),
//     use_http_fn(async function edit_object(req: CustomRequestType) {
//         const {_patch, _source} = req;
//         if (!_source || !_patch)
//             throw mk_err('Internal error', 500);
//
//         const id = _.pick(_source, ['_id']);
//         const patch = _.omit(_patch, '_id');
//         try {
//             let {numAffected} = await db.updateAsync(id, _patch, {
//                 multi: false,
//                 upsert: false
//             });
//             if (numAffected != 1)
//                 throw new Error('Internal error');
//         } catch (e: any & Error) {
//             throw mk_err(e.message, 500);
//         }
//         const result = await db.findOneAsync(id);
//         return {result};
//     }),
// );
// router.delete('/', use_http_fn(async (req, res) => {
//     const id = _.pick(req.body, pk);
//     const count = await db.countAsync(id);
//     if (count == 0)
//         throw mk_err('There is no record to modify');
//     if (count > 1)
//         throw mk_err('Trying to edit too many records');
//
//     const removed = await db.removeAsync(id, {multi: false});
//     if (removed != 1)
//         throw mk_err('Internal error', 500);
//
//     return {code: 200};
// }));

export default router;