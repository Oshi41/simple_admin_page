import {mk_err} from "./utils";
import {deepStrictEqual as de, fail} from 'assert'

it('mk_err', ()=>{
    let err = mk_err('message', 200);
    de(err.message, 'message');
    de(err.code, 200);
});