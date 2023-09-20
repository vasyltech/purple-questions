const SYSTEM_PROMPT = 'You are a polite customer support agent. Use the best customer support guidances. Do not include any placeholders like "[Your Name]", "[Company Name]", etc. The generated message will be forwarded to customer as-is.';

const USER_PROMPT = `Generate response to the user message based ONLY on DOCUMENTATION. Answer ONLY to questions listed in the QUESTIONS TO ANSWER section. Do not fabricate answers. For any other questions in the USER MESSAGE, reply that you do not have knowledge to answer it. {constraint}

DOCUMENTATION:
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
                    .replace('{message}', data.message)
                    .replace('{constraint}', data.constraint)
                    .replace('{questions}', data.material.map(
                        (m) => m.question).join('\n')
                    ).replace('{material}', data.material.map(
                        (m) => `${m.name}\n${m.text}`).join('\n\n')
                    ) : USER_PROMPT
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}