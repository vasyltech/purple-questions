const { URL } = require('url');
const _       = require('lodash');

import Settings from './settings';
import GoogleRepository from './repository/google';
import Bridge from './bridge';

// Bridge.addHook('pq-pull-messages', async () => {
//     let response = [];

//     if (Settings.getAppSetting('gmail-auth-token', false)) {
//         await GoogleRepository.fetchNewThreads();
//     }

//     return response;
// });

Bridge.addHook('pq-message-send', async (email, content) => {
    let result = false;

    if (Settings.getAppSetting('gmail-auth-token', false)) {
        result = await GoogleRepository.sendEmail();
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

export default Methods;