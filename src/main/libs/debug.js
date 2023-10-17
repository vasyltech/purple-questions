const { app } = require('electron');
const Fs      = require('fs');
const Path    = require('path');
const _       = require('lodash');

import Settings from '../settings';

/**
 * Get the base path to the logs directory
 *
 * @returns {String}
 */
function GetLogsBasePath(suffix = null) {
    const basePath = Path.join(
        Settings.getSetting('appDataFolder', app.getPath('userData')),
        'store/logs'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    return suffix ? Path.join(basePath, suffix) : basePath;
}

export default {

    /**
     *
     * @param {*} channel
     * @param {*} method
     * @param {*} args
     * @param {*} error
     */
    error: (channel, method, args, error) => {
        const ts = (new Date()).toLocaleDateString(
            'en-us',
            {
                weekday:"long",
                year:"numeric",
                month:"short",
                day:"numeric",
                hour: "numeric",
                minute: "numeric",
                second: "numeric"
            }
        );

        // Prepare the error data
        const errorData = {
            message: error.message,
            stack: error.stack
        };

        Fs.appendFileSync(
            GetLogsBasePath('errors.log'),
            `[${ts}]: ${JSON.stringify({ channel, method, args, error: errorData })}\n`,
        )
    },

    /**
     *
     * @param {*} anything
     * @param {*} namespace
     */
    log: (anything, namespace = 'default') => {
        Fs.appendFileSync(
            Path.join(GetLogsBasePath(), `${namespace}.log`),
            (_.isString(anything) ? anything : JSON.stringify(anything)) + '\n'
        )
    }

}