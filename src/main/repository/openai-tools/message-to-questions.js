const SYSTEM_PROMPT = 'You are a helpful assistant. Output ONLY a valid JSON.';

const USER_PROMPT = `User sent a support message. They want guidance on how to resolve their questions.

USER MESSAGE:
"""
{message}
"""

Step 1. Rewrite the user message.
Step 2. Rewrite Step 1 output as the list of "How to..?" questions user is asking. Keep the questions generic. DO NOT include in generated questions names, website domains or sensitive user data.

If user message does not have any problems or questions, DO NOT make up them. Just return an empty JSON object.

OUTPUT:
{"rewrite": "output of the Step 1 as string","questions": "array of questions from Step 2"}
`;

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
        ]
    }
}

export default {

    getCorpus: GetCorpus

}