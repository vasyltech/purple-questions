const _ = require('lodash');

// Default prompt if persona is not defined
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

// The actual prompt that converts message into the list of questions
const USER_PROMPT = `Analyze user message. Translate to English if necessary and rewrite. If the message is a support request and contains questions, rewrite it as a list of 1-sentence questions. Otherwise, return an empty array. Return the list ONLY as valid JSON object in the following format:

{"rewrite": "translated and rewritten user message", "questions": ["array of 1-sentence questions"]}

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