const _ = require('lodash');

// Default prompt if persona is not defined
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

// The actual prompt that converts message into the list of questions
const USER_PROMPT = `Analyze user support request. Translate to English if necessary. Output how you understand the support request as a list of 1-sentence questions that user is asking. Return the list ONLY as valid JSON array.

USER SUPPORT REQUEST:
"""
{message}
"""`;

/**
 *
 * @param {*} message
 * @returns
 */
function GetCorpus(message, persona) {
    return {
        messages: [
            {
                role: 'system',
                content: _.get(persona, 'description') || DEFAULT_SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: USER_PROMPT.replace('{message}', message)
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}