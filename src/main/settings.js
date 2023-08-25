const Fs      = require('fs');
const Path    = require('path');
const { app } = require('electron');
const _       = require('lodash');

/**
 * Get the full path to the settings
 *
 * @returns {String}
 */
function GetSettingsPath() {
    const basePath = Path.join(app.getPath('userData'), 'store');
    const filePath = Path.join(basePath, 'settings.json');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    if (!Fs.existsSync(filePath)) {
        Fs.writeFileSync(filePath, '{}');
    }

    return filePath;
}

/**
 *
 * @param {*} settings
 * @returns
 */
function PrepareSettings(settings) {
    // Mask the API key
    if (typeof settings.apiKey === 'string' && settings.apiKey.length) {
        settings.apiKey = `sk-${'•'.repeat(68)}`;
    }

    return settings;
}

/**
 *
 * @returns
 */
function ReadSettings() {
    const fullPath = GetSettingsPath();
    const response = JSON.parse(Fs.readFileSync(fullPath).toString());

    return response;
}

export default {

    /**
     *
     * @param {*} settings
     * @returns
     */
    saveSettings: (settings) => {
        const fullPath    = GetSettingsPath();
        const oldSettings = JSON.parse(Fs.readFileSync(fullPath).toString());

        const newSettings = Object.assign({}, oldSettings, settings);

        Fs.writeFileSync(fullPath, JSON.stringify(newSettings));

        return PrepareSettings(newSettings);
    },

    /**
     *
     * @param {*} filePath
     * @returns
     */
    readSettings: () => PrepareSettings(ReadSettings),

    /**
     *
     * @param {*} setting
     * @returns
     */
    getSetting: (setting) => {
        const settings = ReadSettings();

        return _.get(settings, setting);
    }

}