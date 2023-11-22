const Fs      = require('fs');
const Path    = require('path');
const { app } = require('electron');

import Settings from './settings';

/**
 * Get the base path to the addons directory
 *
 * @returns {String}
 */
function GetAddonsBasePath(append = null) {
    const basePath = Path.join(
        Settings.getAppSetting('appDataFolder', app.getPath('userData')),
        'store/addons'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the message index
        Fs.writeFileSync(Path.join(basePath, '.index'), '[]');
    }

    return append ? Path.join(basePath, append) : append;
}


/**
 *
 */
const Methods = {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getAddons: async (page = 0, limit = 50) => {
        // Cloning the array to avoid issue with reverse
        const index = JSON.parse(
            Fs.readFileSync(GetAddonsBasePath('.index')).toString()
        );

        const start = page * limit;
        const list  = index.reverse().slice(start, start + limit);

        return list;
    },

    /**
     *
     * @param {*} path
     * @returns
     */
    readAddon: async (path) => {
        const response = {};
        const filepath = Path.join(path, 'package.json');

        if (Fs.existsSync(filepath)) {
            // Reading the package.json
            const details = JSON.parse(Fs.readFileSync(filepath).toString());

            response.params = details.params || []
        }

        return response;
    }

}

export default Methods;