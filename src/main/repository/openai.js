const _              = require('lodash');
const { OpenAI }     = require('openai');
const Fs             = require('fs');
const { EOL }        = require('os');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const Path           = require('path');

import Document2QuestionsTool from'./openai-tools/document-to-questions';
import Question2AnswerTool from './openai-tools/question-to-answer';
import Message2QuestionsTool from'./openai-tools/message-to-questions';
import Message2AnswerTool  from './openai-tools/message-to-answer';
import Settings from '../settings';

let Client         = null;
let ModelListCache = null;

/**
 *
 * @param {*} questions
 * @returns
 */
function ConvertToJsonl(questions) {
    const list    = [];
    const persona = _.get(Settings.getSetting('persona', []), '[0]');

    _.forEach(questions, (question) => {
        list.push(JSON.stringify({
            messages: [
                {
                    role: 'system',
                    content: _.get(persona, 'description') || 'You are an invaluable virtual customer support representative.'
                },
                {
                    role: 'user',
                    content: question.text
                },
                {
                    role: 'assistant',
                    content: question.answer
                }
            ]
        }));
    });

    return list.join(EOL);
}

/**
 * Create a temp file with tuning data
 *
 * @param {Array} questions
 *
 * @returns {String}
 */
function CreateTempFilepath(questions) {
    const basePath = Path.join(app.getPath('userData'), 'tmp');
    const uuid     = uuidv4();
    const filepath = Path.join(basePath, `${uuid}.tmp`);

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
    }

    // Create tmp file
    Fs.writeFileSync(filepath, ConvertToJsonl(questions));

    return filepath;
}

/**
 * Get OpenAI client
 *
 * @returns OpenAI
 */
function GetClient() {
    if (_.isNull(Client)) {
        Client = new OpenAI({
            apiKey: Settings.getSetting('apiKey')
        });
    }

    return Client;
}

/**
 *
 * @returns
 */
async function FetchModelList() {
    if (!ModelListCache) {
        const result   = await GetClient().models.list();
        ModelListCache = result.data;
    }

    return ModelListCache;
}

const Methods = {

    /**
     *
     * @returns
     */
    getLlmModelList: async () => {
        const list = await FetchModelList();

        return list.map(m => m.id);
    },

    /**
     *
     * @returns
     */
    getFineTuningModelList: async () => {
        const list = await FetchModelList();

        // Based on the documentation
        // https://platform.openai.com/docs/guides/fine-tuning/what-models-can-be-fine-tuned
        const response = [
            'gpt-3.5-turbo-0613',
            'babbage-002',
            'davinci-002'
        ];

        // Also appending all that are allowed for fine-tuning
        _.forEach(list, (m) => {
            if (_.get(m, 'permission[0].allow_fine_tuning') === true) {
                response.push(m.id);
            }
        });

        return response;
    },

    /**
     * Preparing the list of questions from the provided document
     *
     * @param {Document} document
     *
     * @returns Promise<Object>
     */
    prepareQuestionListFromDocument: async (document) => {
        const corpus = Document2QuestionsTool.getCorpus(
            document,
            _.get(Settings.getSetting('persona', []), '[0]')
        );

        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Document2Questions'
        });

        return {
            output: JSON.parse(_.get(result, 'choices[0].message.content', '{}')),
            usage
        }
    },

    /**
     * Prepare answer to the questions with provided information
     *
     * @param {String} question
     * @param {Object} document
     *
     * @returns {Promise<Object>}
     */
    prepareAnswerFromDocument: async (question, document) => {
        const persona = _.get(Settings.getSetting('persona', []), '[0]');
        const corpus  = Question2AnswerTool.getCorpus({
            question,
            document,
        }, persona);

        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Question2Answer'
        });

        return {
            output: _.get(result, 'choices[0].message.content', ''),
            usage
        }
    },

    /**
     * Preparing the list of questions from the incoming user message
     *
     * @param {Object} message
     *
     * @returns Promise<Object>
     */
    prepareQuestionListFromMessage: async (message) => {
        const corpus = Message2QuestionsTool.getCorpus(
            message,
            _.get(Settings.getSetting('persona', []), '[0]')
        );

        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Message2Questions'
        });

        return {
            output: JSON.parse(_.get(result, 'choices[0].message.content', '{}')),
            usage
        }
    },

    /**
     * Prepare embedding for a text
     *
     * @param {String} text
     *
     * @returns {Promise<Object>}
     */
    prepareTextEmbedding: async (text) => {
        const result = await GetClient().embeddings.create({
            model: 'text-embedding-ada-002',
            input: text
        });

        return {
            output: {
                text,
                embedding: _.get(result, 'data[0].embedding', [])
            },
            usage: Object.assign({}, _.get(result, 'usage'), {
                'purpose': 'Embedding'
            })
        };
    },

    /**
     * Prepare the list of embedding
     *
     * @param {Array<string>} questions
     *
     * @returns {Promise<Array>}
     */
    prepareQuestionListEmbedding: async (questions) => {
        const result = await GetClient().embeddings.create({
            model: 'text-embedding-ada-002',
            input: questions
        });

        const response = {
            output: [],
            usage: Object.assign({}, _.get(result, 'usage'), {
                'purpose': 'Embedding'
            })
        };

        // Iterate of the list of results and compile the output
        _.forEach(questions, (question, i) => {
            response.output.push({
                text: question,
                embedding: _.first(
                    _.filter(result.data, (d) => d.index === i)
                ).embedding
            });
        });

        return response;
    },

    /**
     * Prepare answer to the provided user message
     *
     * @param {String}        message
     * @param {Array<Object>} material
     *
     * @returns {Promise<Object>}
     */
    prepareAnswerForMessage: async (message, material) => {
        const corpus = Message2AnswerTool.getCorpus({
            message,
            material,
            constraint: Settings.getSetting('answerConstraints', '')
        }, _.get(Settings.getSetting('persona', []), '[0]'));

        const result = await GetClient().chat.completions.create(Object.assign(
            {
                model: Settings.getSetting('llmModel', 'gpt-3.5-turbo'),
                temperature: 0
            },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Message2Answer'
        });

        return {
            output: _.get(result, 'choices[0].message.content', ''),
            usage
        }
    },

    /**
     *
     * @param {*} questions
     * @returns
     */
    createFineTuningJob: async (questions) => {
        const response = { status: 'failed' };
        const client   = GetClient();

        // Step #1. Uploading the file with tuning data
        const filepath = CreateTempFilepath(questions);

        // const res1     = await GetClient().files.create({
        //     file: Fs.createReadStream(filepath),
        //     purpose: 'fine-tune'
        // });
        const res1 = {
            "object":"file",
            "id":"file-NNsZ22ukpBgUu3CPPI1r53zB",
            "purpose":"fine-tune",
            "filename":"8131cf99-1beb-4c5c-b709-6f2770598a0d.tmp",
            "bytes":17551,
            "created_at":1696364913,
            "status":"uploaded",
            "status_details":null
        };

        if (_.get(res1, 'status') === 'uploaded') {
            response.fileId = res1.id;
            response.status = 'uploaded';

            // Step #2. Creating a fine tuning job
            // const res2 = await GetClient().fineTuning.jobs.create({
            //     training_file: res1.id,
            //     model: Settings.getSetting('fineTuningBaseModel', 'gpt-3.5-turbo-0613')
            // });
            const res2 = {
                "object":"fine_tuning.job",
                "id":"ftjob-iBD8gAYr0wnqqYAUM1FqMhBs",
                "model":"gpt-3.5-turbo-0613",
                "created_at":1696365045,
                "finished_at":null,
                "fine_tuned_model":null,
                "organization_id":"org-JuIp7Eo09NSxINJjYCkq2b8X",
                "result_files":[],
                "status":"validating_files",
                "validation_file":null,
                "training_file":"file-NNsZ22ukpBgUu3CPPI1r53zB",
                "hyperparameters":{"n_epochs":"auto"},
                "trained_tokens":null,
                "error":null
            }

            console.log(JSON.stringify(res2));

            if (_.get(res2, 'status') === 'queued') {
                response.fineTuningId = res2.id;
                response.status       = 'queued';
            }
        }

        return response;
    }

}

export default Methods;