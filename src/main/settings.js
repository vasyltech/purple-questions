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

    return JSON.parse(Fs.readFileSync(fullPath).toString());
}

/**
 *
 * @returns
 */
function SaveSettings(settings) {
    Fs.writeFileSync(GetSettingsPath(), JSON.stringify(settings));
}

/**
 *
 */
const Methods = {

    /**
     * Get all app settings
     *
     * @returns {Object}
     */
    getAppSettings: (raw = false) => {
        const settings = _.get(ReadSettings(), 'app', {});

        if (!settings.appDataFolder) {
            settings.appDataFolder = app.getPath('userData');
        }

        if (!settings.similarityDistance) {
            settings.similarityDistance = 25;
        }

        return raw ? settings : PrepareSettings(settings);
    },

    /**
     * Save app settings
     *
     * @param {Object} settings
     *
     * @returns {Object}
     */
    saveAppSettings: (settings) => {
        const original = ReadSettings();

        // Override the old app settings
        original.app = Object.assign({}, _.get(original, 'app', {}), settings);

        SaveSettings(original);

        return PrepareSettings(original.app);
    },

    /**
     * Get app setting
     *
     * @param {String} setting
     *
     * @returns {Mixed}
     */
    getAppSetting: (setting, def = null) => {
        const value = _.get(Methods.getAppSettings(true), setting);

        return _.isUndefined(value)
                || _.isNull(value)
                || (_.isString(value) && value.length === 0) ? def : value;
    },

    /**
     * Get addon settings
     *
     * @param {String} addon
     * @param {Mixed}  def
     *
     * @returns {Mixed}
     */
    getAddonSetting: (addon, def = null) => {
        return _.get(ReadSettings(), `addons.${addon}`, def);
    },

    /**
     *
     * @param {*} setting
     *
     * @returns
     */
    setAddonSetting: (addon, setting, value) => {
        const original = ReadSettings();

        // Override the addon setting
        _.set(original, `addons.${addon}.${setting}`, value);

        SaveSettings(original);

        return true;
    },

}

export default Methods;