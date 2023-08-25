const SYSTEM_PROMPT = 'You are a helpful assistant who prepares the list of questions. Output ONLY a valid JSON array of questions.';

const USER_PROMPT = `Rewrite the user message as the list of "How to..?" questions that user is asking.
Keep the questions generic. DO NOT include in generated questions names, website domains or sensitive user data.
If user message does not have any problems or questions, DO NOT make up them. Just return an empty array.

USER MESSAGE:
{message}`;

function GetCorpus(message = null) {
    return [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        {
            role: 'user',
            content: message ? USER_PROMPT.replace('{message}', message) : USER_PROMPT
        }
    ];
}

export default {

    getCorpus: GetCorpus

}