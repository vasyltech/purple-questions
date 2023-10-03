const _ = require('lodash');

// Default prompt if persona is not defined
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

// The actual prompt that converts text into the list of questions
const USER_PROMPT = `Answer the provided question with few examples, if applicable. Do not fabricate the answer.

QUESTION:
"""
{question}
"""

USE THIS MATERIAL TO ANSWER:
"""
{material}
"""`;

/**
 *
 * @param {*} data
 * @param {*} persona
 * @returns
 */
function GetCorpus(data, persona) {
    return {
        messages: [
            {
                role: 'system',
                content: _.get(persona, 'description') || DEFAULT_SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: USER_PROMPT
                    .replace('{material}', data.document.text)
                    .replace('{question}', data.question)
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}