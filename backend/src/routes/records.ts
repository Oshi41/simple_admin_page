import {Router} from 'express';
import {use_http_fn} from "../utils";
import {db} from "../static";

const router = Router();

router.get('/', use_http_fn(async (req, res) => {
    const result = await db.findAsync({});
    return {result};
}));

export default router;