const SYSTEM_PROMPT = 'You are a polite customer support agent. Use the best customer support guidances.';

const USER_PROMPT = `Prepare an answer to the user message based on answers to similar questions. If you cannot prepare a good answer, say you do not know. DO NOT fabricate the answer. {constraint}

MATERIAL:
"""
{material}
"""

USER MESSAGE:
"""
{message}
"""`;

/**
 *
 * @param {*} data
 * @returns
 */
function GetCorpus(data = null) {
    return {
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: data ? USER_PROMPT
                    .replace('{constraint}', data.constraint)
                    .replace('{message}', data.message)
                    .replace('{material}', data.material.map(
                        (m) => `${m.name}\n${m.text}`).join('\n\n')
                    ) : USER_PROMPT
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}