const SYSTEM_PROMPT = 'You are a helpful assistant and you use provided information to generate the best possible answer to the user question. Keep the answer concise.';

const USER_PROMPT = `Generate answer to the user question based on the provided information. If you cannot identify the good answer, just say that you do not know. Do not fabricate the answer.
INFORMATION:
{text}

USER QUESTION:
{question}`;

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
                    .replace('{text}', data.document.text)
                    .replace('{question}', data.question) : USER_PROMPT
            }
        ]
    }
}

export default {

    getCorpus: GetCorpus

}