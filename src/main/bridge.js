const Fs      = require('fs');
const Path    = require('path');
const { app } = require('electron');
const _       = require('lodash');

const Settings = require(Path.resolve(__dirname, 'settings'));
const Hooks    = {};

function AddHook(hook, func) {
    if (_.isUndefined(Hooks[hook])) {
        Hooks[hook] = [];
    }

    Hooks[hook].push(func);
}

const Bridge = {

    /**
     *
     * @param {*} hook
     * @param {*} func
     */
    addHook: AddHook,

    /**
     *
     */
    api: {
        settings: Settings
    }

}

/**
 *
 */
function LoadAddOns() {
    const basepath = Path.join(
        Settings.getAppSetting('appDataFolder', app.getPath('userData')),
        'store/addons'
    );

    const addons = JSON.parse(
        Fs.readFileSync(Path.join(basepath, '.index')).toString()
    );

    // Iterating through the list of registered addons and load active
    for(let i = 0; i < addons.length; i++) {
        if (addons[i].status === 'active') {
            const addon = require(require.resolve(addons[i].path, {
                paths: [ basepath ]
            }));

            if (_.isFunction(addon.init)) {
                addon.init(Bridge);
            }
        }
    }
}

module.exports = {

    /**
     *
     */
    init: () => {
        LoadAddOns();
    },

    /**
     *
     */
    addHook: AddHook,

    /**
     *
     * @param {*} hook
     * @returns
     */
    triggerHook: async (hook, data) => {
        const results = [];

        if (!_.isUndefined(Hooks[hook])) {
            for(let i = 0; i < Hooks[hook].length; i++) {
                const cb = Hooks[hook][i];

                let res = await cb(data);

                if (_.isArray(res)) {
                    results.push(...res);
                }
            }
        }

        return results.length > 0 ? results : null;
    }

}