const _ = require('lodash');

// Default prompt if persona is not defined
const DEFAULT_SYSTEM_PROMPT = 'You are Aarmie, a polite customer support assistant. Use the best customer support guidances to answer user message. Translate the output into the language used in user message.';

// The actual prompt that converts text into the list of questions
const USER_PROMPT = `Use MY KNOWLEDGE BASE as your only source to generate response to the USER MESSAGE. Answer ONLY to questions listed in the QUESTIONS TO ANSWER section. Do not fabricate answers. Provide as detailed answer as possible with an example, if applicable. {constraint}

MY KNOWLEDGE BASE:
"""
{material}
"""

USER MESSAGE:
"""
{message}
"""

QUESTIONS TO ANSWER:
"""
{questions}
"""
`;

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
                    .replace('{message}', data.message)
                    .replace('{constraint}', data.constraint)
                    .replace('{questions}', data.material.map(
                        (m) => m.question).join('\n')
                    ).replace('{material}', data.material.map(
                        (m) => `${m.name}\n${m.text}`).join('\n\n')
                    )
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}