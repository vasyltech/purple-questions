const SYSTEM_PROMPT = 'You are a helpful assistant and you use provided information to generate the best possible answer to the user question. Do not include any placeholders like "[Your Name]", "[Company Name]", etc. The generated message will be forwarded to customer as-is.';

const USER_PROMPT = `Generate response to the user message based on the provided material. Answer only to questions that you can find answers in provided material. Do not fabricate the answer.

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