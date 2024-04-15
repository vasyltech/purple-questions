const { google } = require('googleapis');
const { shell }  = require('electron');
const Path       = require('path');

const Settings = require(Path.resolve(__dirname, '../settings'));
// const Template = require( './../../../../src/main/repository/tmpl/email');

const REDIRECT_URL = 'http://localhost:5173/authorize';

let AuthClient = null;

/**
 *
 * @param {*} to
 * @param {*} from
 * @param {*} subject
 * @param {*} message
 * @returns
 */
function makeEmailBody(to, from, subject, message) {
    const str = ["Content-Type: text/html; charset=\"UTF-8\"\n",
        "MIME-Version: 1.0\n",
        "Content-Transfer-Encoding: 7bit\n",
        "to: ", to, "\n",
        "from: ", from, "\n",
        "subject: ", subject, "\n\n",
        message
    ].join('');

    return Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_');
}

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

module.exports = {

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
    },

    /**
     *
     * @param {*} email
     * @param {*} snippet
     * @param {*} content
     */
    sendEmail: async (email, snippet, content) => {
        const auth  = GetAuthClient();
        const gmail = google.gmail({ version: 'v1', auth });

    //    await gmail.users.messages.send({
    //         userId: 'me',
    //         requestBody: {
    //             raw: makeEmailBody(
    //                 //email,
    //                 'vasyl@vasyltech.com',
    //                 'support@aamplugin.com',
    //                 'AAM Support',
    //                 Template.replace('{{ snippet }}', snippet)
    //                     .replace('{{ content }}', content)
    //             ),
    //             snippet
    //         }
    //     });

        return true;
    }
}