const _ = require('lodash');

// Default prompt if persona is not defined
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant.';

// The actual prompt that converts text into the list of questions
const USER_PROMPT = `Analyze the provided material. Output how you understand the material as a list of 1-sentence quiz questions. Generate as many questions as you can think of. Return the output as valid JSON array of strings that represent questions.

MATERIAL:
# {title}

{text}`;

/**
 * Get corpus
 *
 * @param {Document} document
 * @param {Persona}  persona
 *
 * @returns {Object}
 */
function GetCorpus(document, persona = null) {
    return {
        messages: [
            {
                role: 'system',
                content: _.get(persona, 'description') || DEFAULT_SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: USER_PROMPT
                    .replace('{text}', document.text)
                    .replace('{title}', document.name)
            }
        ]
    };
}

module.exports = {

    /**
     * Get payload that we will send to LLM
     */
    getCorpus: GetCorpus

}