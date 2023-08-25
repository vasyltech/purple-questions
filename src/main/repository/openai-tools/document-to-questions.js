const SYSTEM_PROMPT = 'You are a helpful assistant who prepares the list of questions. Output ONLY a valid JSON array of questions.';

const USER_PROMPT = `Prepare the list of "How to..?" questions that can be answered with information from the text.
Generate as many questions as you can think of.
Keep questions generic. DO NOT include in generated questions names, website domains or sensitive user data.

TEXT:
{text}`;

function GetCorpus(doc = null) {
    return [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        {
            role: 'user',
            content: doc ? USER_PROMPT.replace('{text}', doc.content) : USER_PROMPT
        }
    ];
}

export default {

    getCorpus: GetCorpus

}