const _              = require('lodash');
const { OpenAI }     = require('openai');
const Fs             = require('fs');
const { EOL }        = require('os');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');

import Document2QuestionsTool from'./openai-tools/document-to-questions';
import Question2AnswerTool from './openai-tools/question-to-answer';
import Message2QuestionsTool from'./openai-tools/message-to-questions';
import Message2AnswerTool  from './openai-tools/message-to-answer';
import Settings from '../settings';

let Client = null;

/**
 *
 * @param {*} uuid
 * @returns
 */
function ConvertToJsonl(filepath) {
    const list = Methods.readTuning(uuid).map((i) => JSON.stringify(i));
    const temp = GetTuningBasePath(`${uuid}.tmp`);

    Fs.writeFileSync(temp, list.join(EOL));

    return temp;
}

/**
 * Create a temp file with tuning data
 *
 * @returns {String}
 */
function CreateTempFilepath(content) {
    const basePath = Path.join(app.getPath('userData'), 'tmp');
    const uuid     = uuidv4();
    const fpath    = Path.join(basePath, `${uuid}.tmp`);

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create tmp file
        Fs.writeFileSync(fpath, ConvertToJsonl(content));
    }

    return fpath;
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

export default {

    /**
     *
     * @returns
     */
    getModelList: async () => {
        const list = await GetClient().models.list();

        return list.data.map(m => m.id)
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
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
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
     * @param {*} content
     * @returns
     */
    createFineTuningJob: async (content) => {
        const response = { status: 'failed' };
        const client   = GetClient();

        // Step #1. Uploading the file with tuning data
        const filepath = CreateTempFilepath(content);
        const res1     = await client.file.create({
            file: Fs.createReadStream(filepath),
            purpose: 'fine-tune'
        });

        if (_.get(res1, 'status') === 'uploaded') {
            response.fileId = res1.id;
            response.status = 'uploaded';

            // Step #2. Creating a fine tuning job
            const res2 = client.fineTuning.jobs.create({
                training_file: res1.id,
                model: Settings.getSetting('fineTuningBaseModel', 'gpt-3.5-turbo-0613')
            });

            if (_.get(res2, 'status') === 'queued') {
                response.fineTuningId = res2.id;
                response.status       = 'queued';
            }
        }

        return response;
    }

}