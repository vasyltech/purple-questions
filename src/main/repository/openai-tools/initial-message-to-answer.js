const _ = require('lodash');

// Default prompt if persona is not defined
const DEFAULT_SYSTEM_PROMPT = 'You are a polite customer support assistant.';

// The actual prompt that converts text into the list of questions
const USER_PROMPT = `Use the best customer support guidances to answer user message. Follow these instructions:

- Translate the output to the same language as in the USER MESSAGE.
- Use "MY KNOWLEDGE BASE" as the additional material to generate response to the "USER MESSAGE".
- Only answer questions listed in the "QUESTIONS TO ANSWER" section.
- Provide as detailed answer as possible with an example, if applicable.
- Output only answer without references to external sources.
- Avoid rendering nested lists.
- Always finish with sentence "Keep me posted if anything".
- {constraint}

USER MESSAGE:
"""
{message}
"""

QUESTIONS TO ANSWER:
"""
{questions}
"""

MY KNOWLEDGE BASE:
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