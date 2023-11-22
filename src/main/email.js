const { URL } = require('url');

import Settings from './settings';
import GoogleRepository from './repository/google';
import Bridge from './bridge';

// If there is an established connection (stored token) - register hook
Bridge.addHook('pq-pull-messages', async () => {
    let response = [];

    if (Settings.getAppSetting('gmail-auth-token', false)) {
        await GoogleRepository.fetchNewThreads();
    }

    return response;
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