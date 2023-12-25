import {app} from "./static";
import record_router from './routes/record';

export function run() {
    app.use('/router', record_router);
}

if (module?.require?.main?.id == module?.id)
    run();

