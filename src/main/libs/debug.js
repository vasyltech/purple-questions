const { app } = require('electron');
const Fs      = require('fs');
const Path    = require('path');
const _       = require('lodash');

const Settings = require(Path.resolve(__dirname, '../settings'));

/**
 * Get the base path to the logs directory
 *
 * @returns {String}
 */
function GetLogsBasePath(suffix = null) {
    const basePath = Path.join(
        Settings.getAppSetting('appDataFolder', app.getPath('userData')),
        'store/logs'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    return suffix ? Path.join(basePath, suffix) : basePath;
}

/**
 *
 * @returns
 */
function GetTimestamp() {
    return (new Date()).toLocaleDateString(
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
}

module.exports = {

    /**
     *
     * @param {*} channel
     * @param {*} method
     * @param {*} args
     * @param {*} error
     */
    error: (channel, method, args, error) => {
        const ts = GetTimestamp();

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
            `[${GetTimestamp()}]: ${(_.isString(anything) ? anything : JSON.stringify(anything))}\n`
        )
    }

}