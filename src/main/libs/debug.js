const { app } = require('electron');
const Fs      = require('fs');
const Path    = require('path');
const _       = require('lodash');

/**
 * Get the base path to the logs directory
 *
 * @returns {String}
 */
function GetLogsBasePath() {
    const basePath = Path.join(app.getPath('userData'), 'store', 'logs');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    return basePath;
}

export default {

    log: (anything, namespace = 'default') => {
        Fs.writeFileSync(
            Path.join(GetLogsBasePath(), `${namespace}.logs`),
            (_.isString(anything) ? anything : JSON.stringify(anything)) + '\n'
        )
    }

}