const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');

import Settings from './settings';

/**
 * Get the base path to the addons directory
 *
 * @returns {String}
 */
function GetAddonsBasePath(append = null) {
    const basePath = Path.join(
        Settings.getSetting('appDataFolder', app.getPath('userData')),
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
    }

}

export default Methods;