const SYSTEM_PROMPT = 'You are a helpful assistant who prepares the list of questions';

const USER_PROMPT = `Prepare the list of "How to..?" questions that can be answered with information from the text. Generate as many questions as you can think of and answer them. Keep questions generic.

TEXT:
{text}`;

/**
 * Get corpus
 *
 * @param {Document} doc
 *
 * @returns {Array}
 */
function GetCorpus(doc = null) {
    return {
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: doc ? USER_PROMPT.replace('{text}', doc.text) : USER_PROMPT
            }
        ],
        functions: [
            {
                name: "accept_output",
                description: "Get the array of generated questions and answers",
                parameters: {
                    type: "object",
                    properties: {
                        output: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question: {
                                        "type": "string"
                                    },
                                    answer: {
                                        "type": "string"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        ]
    };
}

export default {

    getCorpus: GetCorpus

}