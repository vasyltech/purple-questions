const _              = require('lodash');
const { OpenAI }     = require('openai');
const Fs             = require('fs');
const { EOL }        = require('os');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const Path           = require('path');

const Document2QuestionsTool    = require(Path.resolve(__dirname, 'openai-tools/document-to-questions'));
const Question2AnswerTool       = require(Path.resolve(__dirname, 'openai-tools/question-to-answer'));
const Message2QuestionsTool     = require(Path.resolve(__dirname, 'openai-tools/message-to-questions'));
const InitialMessage2AnswerTool = require(Path.resolve(__dirname, 'openai-tools/initial-message-to-answer'));
const Settings                  = require(Path.resolve(__dirname, '../settings'));
const Debug                     = require(Path.resolve(__dirname, '../libs/debug'));

let Client         = null;
let ModelListCache = null;

/**
 *
 * @param {*} questions
 * @returns
 */
function ConvertToJsonl(questions) {
    const list = [];

    _.forEach(questions, (question) => {
        list.push(JSON.stringify({
            messages: [
                {
                    role: 'system',
                    content: Settings.getAppSetting('persona.description')
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
            apiKey: Settings.getAppSetting('apiKey')
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

/**
 *
 * @param {*} result
 * @returns
 */
function ParseResponseMessage(result, expectJson = false) {
    // Sometimes OpenAI returns valid JSON wrapped into ```json ```. In this
    // case remove that
    let response = _.get(result, 'choices[0].message.content', expectJson ? '{}' : '');

    if (expectJson && (response.indexOf('```json') === 0)) {
        response = response.substring(7, response.length - 3).trim();
    }

    return response;
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
            'gpt-3.5-turbo-1106',
            'gpt-3.5-turbo-0613',
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
     *
     * @param {*} id
     * @returns
     */
    getFineTuningJob: async (id) => GetClient().fineTuning.jobs.retrieve(id),

    /**
     *
     * @param {*} id
     * @returns
     */
    getFineTuningJobEvents: async (id, limit = 99) => GetClient().fineTuning.jobs.listEvents(id, limit),

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
            Settings.getAppSetting('persona')
        );

        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getAppSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        Debug.log({
            method: 'prepareQuestionListFromDocument',
            corpus,
            result
        });

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Document2Questions'
        });

        return {
            output: JSON.parse(ParseResponseMessage(result, true)),
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
        const corpus = Question2AnswerTool.getCorpus({
            question,
            document,
        }, Settings.getAppSetting('persona'));

        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getAppSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        Debug.log({
            method: 'prepareAnswerFromDocument',
            corpus,
            result
        });

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Question2Answer'
        });

        return {
            output: ParseResponseMessage(result),
            usage,
            corpus
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
            Settings.getAppSetting('persona')
        );

        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getAppSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        Debug.log({
            method: 'prepareQuestionListFromMessage',
            corpus,
            result
        });

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Message2Questions'
        });

        return {
            output: JSON.parse(ParseResponseMessage(result, true)),
            usage,
            corpus
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
            model: 'text-embedding-3-small',
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
            model: 'text-embedding-3-small',
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
    composeInitialAnswerForMessage: async (message, material) => {
        const corpus = InitialMessage2AnswerTool.getCorpus({
            message,
            material,
            constraint: Settings.getAppSetting('answerConstraints', '')
        }, Settings.getAppSetting('persona'));

        const result = await GetClient().chat.completions.create(Object.assign(
            {
                model: Settings.getAppSetting('llmModel', 'gpt-3.5-turbo'),
                temperature: 0
            },
            corpus
        ));

        Debug.log({
            method: 'composeInitialAnswerForMessage',
            corpus,
            result
        });

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Message2Answer'
        });

        return {
            output: ParseResponseMessage(result),
            usage,
            corpus
        }
    },

    /**
     *
     * @param {*} messages
     * @returns
     */
    prepareAnswerFromHistory: async (messages) => {
        const result = await GetClient().chat.completions.create(Object.assign(
            {
                model: Settings.getAppSetting('llmModel', 'gpt-3.5-turbo'),
                temperature: 0
            },
            messages
        ));

        Debug.log({
            method: 'prepareAnswerFromHistory',
            messages,
            result
        });

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'MessageHistory2Answer'
        });

        return {
            output: ParseResponseMessage(result),
            usage,
            corpus: messages
        }
    },

    /**
     *
     * @param {*} questions
     * @returns
     */
    createFineTuningJob: async (questions, settings) => {
        const response = { status: 'failed', fine_tuning_logs: [] };
        const client   = GetClient();

        // Step #1. Uploading the file with tuning data
        const filepath = CreateTempFilepath(questions);

        const res1     = await client.files.create({
            file: Fs.createReadStream(filepath),
            purpose: 'fine-tune'
        });

        response.fine_tuning_logs.push({
            type: 'upload_file',
            result: res1
        });

        if (_.get(res1, 'status') === 'uploaded') {
            response.file_id = res1.id;
            response.status  = 'uploaded';

            // Step #2. Creating a fine tuning job
            const res2 = await client.fineTuning.jobs.create({
                training_file: res1.id,
                model: settings.base_model || 'gpt-3.5-turbo-0613',
                hyperparameters: {
                    n_epochs: parseInt(settings.n_epochs, 10) || 'auto'
                },
                suffix: settings.llm_suffix || null
            });

            response.fine_tuning_logs.push({
                type: 'create_job',
                result: res2
            });

            if (['validating_files', 'queued'].includes(_.get(res2, 'status'))) {
                response.fine_tuning_job_id = res2.id;
                response.status             = 'queued';
            }
        }

        return response;
    }

}

module.exports = Methods;