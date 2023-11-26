const { google } = require('googleapis');
const { shell }  = require('electron');

import Settings from './../settings';

const REDIRECT_URL = 'http://localhost:5173/authorize';

let AuthClient = null;

/**
 *
 * @returns {google.auth.OAuth2}
 */
function GetAuthClient() {
    if (AuthClient === null) {
        AuthClient = new google.auth.OAuth2(
            '189727986582-flqf9m5ga2308a57f4pfq8onb81eaaqi.apps.googleusercontent.com',
            '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',
            REDIRECT_URL
        );

        const credentials = Settings.getAppSetting('gmail-auth-token');

        console.log(credentials);

        AuthClient.on('tokens', (tokens) => {
            // We should never receive the refresh token here because we set it
            // in a different place. However, just in case, let's keep it this way
            // Otherwise, we receive the refreshed access token, so storing it in
            // the settings for future use
            if (tokens.refresh_token) {
                Settings.setAppSetting('gmail-auth-token', tokens, true);
            } else {
                Settings.setAppSetting(
                    'gmail-auth-token',
                    Object.assign({}, credentials, tokens),
                    true
                );
            }
        });

        if (credentials !== null) {
            AuthClient.setCredentials(credentials);
        }
    }

    return AuthClient;
}

export default {

    redirectToAuth: () => {
        shell.openExternal(REDIRECT_URL);
    },

    getTokens: async (code) => {
        const auth       = GetAuthClient();
        const { tokens } = await auth.getToken(code);

        Settings.setAppSetting('gmail-auth-token', tokens, true);
    },

    fetchNewThreads: async () => {
        const auth  = GetAuthClient();
        const gmail = google.gmail({ version: 'v1', auth });

        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread AND in:inbox',
            maxResults: 5
        });

        console.log(res.data.messages);
    }
}