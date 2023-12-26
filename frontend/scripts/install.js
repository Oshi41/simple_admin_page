const path = require('path');
const fs = require('fs');

const sym_links = new Map([
    [path.resolve('../backend/src/schema.ts'), path.resolve('./src/schema.ts')]
]);
sym_links.forEach((to, from) => {
    if (fs.existsSync(from))
    {
        if (fs.existsSync(to))
        {
            fs.rmSync(to);
            console.debug(`Removed old file version ${to}`);
        }

        fs.linkSync(from, to);
        console.debug(`Symbolic link created ${from} to ${to}`);
    }
});