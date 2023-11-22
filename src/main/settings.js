const Fs                   = require('fs');
const Path                 = require('path');
const { app, safeStorage } = require('electron');
const _                    = require('lodash');

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
        let response;

        const raw = _.get(Methods.getAppSettings(true), setting);
        response  = _.isUndefined(raw)
                        || _.isNull(raw)
                        || (_.isString(raw) && raw.length === 0) ? def : raw;

        // Is encrypted than decrypt
        if (_.isObject(response)) {
            const encrypted  = response.isEncrypted;
            const serialized = response.isSerialized;

            if (encrypted) {
                try {
                    response = safeStorage.decryptString(
                        Buffer.from(response.value, 'base64')
                    );
                } catch (e) {
                    console.log(e);
                }
            }

            if (serialized) {
                response = JSON.parse(response);
            }
        }

        return response;
    },

    /**
     *
     * @param {*} setting
     * @param {*} value
     * @param {*} encrypt
     */
    setAppSetting: (setting, value, encrypt = false) => {
        const settings = Methods.getAppSettings(true);

        if (encrypt && safeStorage.isEncryptionAvailable()) {
            settings[setting] = {
                isEncrypted: true,
                isSerialized: !_.isString(value),
                value: safeStorage.encryptString(
                    _.isString(value) ? value : JSON.stringify(value)
                ).toString('base64')
            };
        } else {
            settings[setting] = value;
        }

        Methods.saveAppSettings(settings);

        return true;
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
    }

}

export default Methods;