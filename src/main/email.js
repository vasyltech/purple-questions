const { URL }       = require('url');
const _             = require('lodash');
const TextConvertor = require('html-to-text');
const Path          = require('path');

const Settings         = require(Path.resolve(__dirname, 'settings'));
//const GoogleRepository = require(Path.resolve(__dirname, 'repository/google'));
const Bridge           = require(Path.resolve(__dirname, 'bridge'));

/**
 *
 * @param {*} html
 * @param {*} wCount
 *
 * @returns {String}
 */
function PrepareExcerpt(html, wCount = 30) {
    const text  = TextConvertor.convert(html);
    const parts = text.split(/\r\n|\n|\s|\t/g).filter(p => p.trim().length > 0);

    return parts.slice(0, wCount).join(' ') + (parts.length > wCount ? '...' : '');
}

// Bridge.addHook('pq-pull-messages', async () => {
//     let response = [];

//     if (Settings.getAppSetting('gmail-auth-token', false)) {
//         await GoogleRepository.fetchNewThreads();
//     }

//     return response;
// });

Bridge.addHook('pq-message-send', async (data) => {
    let result = false;

    if (data.email && Settings.getAppSetting('gmail-auth-token', false)) {
        result = await GoogleRepository.sendEmail(
            data.email, PrepareExcerpt(data.content), data.content
        );
    }

    return result;
});

const Methods = {

    /**
     *
     * @returns
     */
    redirectToAuth: () => {
        GoogleRepository.redirectToAuth();
    },

    /**
     *
     * @param {*} url
     */
    processCallback: async (url) => {
        const parsed = new URL(url);
        const code   = parsed.searchParams.get('code');

        return GoogleRepository.getTokens(code);
    }

}

module.exports = Methods;