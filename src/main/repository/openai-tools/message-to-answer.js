const SYSTEM_PROMPT = 'You are a helpful assistant and you use provided information to generate the best possible answer to the user question. Keep the answer concise.';

const USER_PROMPT = `Generate an answer to the user message based on the provided material. If you cannot prepare a good answer, say you do not know. DO NOT fabricate the answer.

MATERIAL:
{material}

USER MESSAGE:
{message}`;

function GetCorpus(data = null) {
    return [
        {
            role: 'system',
            content: SYSTEM_PROMPT
        },
        {
            role: 'user',
            content: data ? USER_PROMPT
                .replace('{message}', data.message)
                .replace('{material}', data.material.map(
                    (m) => `${m.question}\n${m.answer}`).join('\n\n')
                ) : USER_PROMPT
        }
    ];
}

export default {

    getCorpus: GetCorpus

}