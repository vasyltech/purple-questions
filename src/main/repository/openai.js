const _          = require('lodash');
const { OpenAI } = require('openai');

import Document2QuestionsTool from'./openai-tools/document-to-questions';
import Question2AnswerTool from './openai-tools/question-to-answer';
import Message2QuestionsTool from'./openai-tools/message-to-questions';
import Message2AnswerTool  from './openai-tools/message-to-answer';
import Settings from '../settings';

let Client = null;

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
     * Preparing the list of questions from the provided document
     *
     * @param {Document} document
     *
     * @returns Promise<Object>
     */
    prepareQuestionListFromDocument: async (document) => {
        const corpus = Document2QuestionsTool.getCorpus(document);
        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Document2Questions'
        });

        let output = {};

        if (_.get(result, 'choices[0].finish_reason') === 'function_call') {
            const args = JSON.parse(
                _.get(result, 'choices[0].message.function_call.arguments', '{}')
            );

            output = args.output;
        } else {
            throw new Error('OpenAI did not respond properly.');
        }

        return {
            output,
            usage,
            corpus: Document2QuestionsTool.getCorpus()
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
            document
        });
        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Question2Answer'
        });

        const answer = _.get(result, 'choices[0].message.content', '');

        return {
            output: answer,
            usage,
            corpus: Question2AnswerTool.getCorpus()
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
     * Preparing the list of questions from the incoming user message
     *
     * @param {Object} message
     *
     * @returns Promise<Object>
     */
    prepareQuestionListFromMessage: async (message) => {
        const corpus = Message2QuestionsTool.getCorpus(message);
        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Message2Questions'
        });

        // Making sure that we got the correct output
        let output = {};

        if (_.get(result, 'choices[0].finish_reason') === 'function_call') {
            output = JSON.parse(
                _.get(result, 'choices[0].message.function_call.arguments')
            );
        } else {
            throw new Error('OpenAI did not respond properly');
        }

        return {
            output,
            usage,
            corpus: Message2QuestionsTool.getCorpus()
        }
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
            material
        });
        const result = await GetClient().chat.completions.create(Object.assign(
            { model: Settings.getSetting('llmModel', 'gpt-3.5-turbo') },
            corpus
        ));

        // Extract the list of questions and usage data
        const usage = Object.assign({}, _.get(result, 'usage'), {
            'purpose': 'Message2Answer'
        });

        const answer = _.get(result, 'choices[0].message.content', '');

        return {
            output: answer,
            usage,
            corpus
        }
    }

}