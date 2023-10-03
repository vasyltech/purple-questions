const Fs      = require('fs');
const Path    = require('path');
const { app } = require('electron');

const Hooks = {

};

export default {

    loadAddOns: () => {
        const basepath = Path.join(app.getPath('userData'), 'addons');

        // Iterating through the directory of addons and loading them


        const m = require(require.resolve('./message-poll', {
            paths: [
                basepath
            ]
        }));

        m.init();
    }

}