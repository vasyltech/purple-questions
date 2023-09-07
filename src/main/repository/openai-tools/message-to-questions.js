const SYSTEM_PROMPT = 'You are a helpful assistant. Always use the function you have been provided with.';

const USER_PROMPT = `User sent a support message. They want guidance on how to resolve their issues.

USER MESSAGE:
"""
{message}
"""

Rewrite the user message and use the rewrite to prepare the list of questions that the user might be asking. Keep the questions generic. DO NOT include in generated questions names, website domains or sensitive user data.

For example, user message "I would like to create a few capabilities for my project. What would you recommend?" can be rewritten as the list of questions like: "How to create a custom capability?", "What are the best practices to name a capability?", "How many capabilities I can create?", etc.`;

/**
 *
 * @param {*} message
 * @returns
 */
function GetCorpus(message = null) {
    return {
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: message ? USER_PROMPT.replace('{message}', message) : USER_PROMPT
            }
        ],
        functions: [
            {
                name: "accept_output",
                description: "Accept the message rewrite and an array of generated questions",
                parameters: {
                    type: "object",
                    properties: {
                        rewrite: {
                            type: "string"
                        },
                        questions: {
                            type: "array",
                            items: {
                                type: "string"
                            }
                        }
                    },
                    required: [
                        "rewrite",
                        "questions"
                    ]
                }
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}