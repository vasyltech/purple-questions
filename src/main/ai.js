const _ = require('lodash');

import OpenAiRepository from './repository/openai';
import DbRepository from './repository/db';
import Documents from './documents';
import Questions from './questions';
import Messages from './messages';
import Tuning from './tuning';

export default {

    /**
     * Return list of all allowed models
     *
     * @returns {Promise<Array>}
     */
    getLlmModelList: async () => OpenAiRepository.getLlmModelList(),

    /**
     *
     * @returns
     */
    getFineTuningModelList: () => OpenAiRepository.getFineTuningModelList(),

    /**
     * Analyze document content and convert it to the list of questions
     *
     * @param {String}  uuid
     * @param {Boolean} merge
     *
     * @returns {Promise<Document>}
     */
    analyzeDocumentContent: async (uuid, merge = true) => {
        // Step #1. Read the document data
        const document = Documents.readDocument(uuid, true);

        // Step #2. Generate the list of questions from the document
        const res1 = await OpenAiRepository.prepareQuestionListFromDocument(
            document
        );

        // Prepare the list of new questions
        const newQuestions = [];

        for(let i = 0; i < res1.output.length; i++) {
            const q = await Questions.createQuestion({
                text: res1.output[i],
                origin: `/documents/${uuid}`
            });

            newQuestions.push(q.uuid);
        }

        // How should we handle the list of new question?
        // If we are merging new questions with existing, then we ONLY append new
        // questions to the list. Otherwise, we first delete all existing questions
        // and replace them with the new list
        if (merge) {
            _.forEach(newQuestions, (q) => {
                if (!document.questions.includes(q)) { // Adding only new questions
                    document.questions.push(q);
                }
            });
        } else {
            // First, let's delete all the questions
            for(let i = 0; i < document.questions.length; i++) {
                await Questions.deleteQuestion(document.questions[i]);
            }

            // Replace document list of questions with new
            document.questions = newQuestions;
        }

        // document.corpus = res1.corpus; // What did we send to OpenAI?
        document.usage = [res1.usage];  // Cost?

        // Updating the document with all the info
        Documents.updateDocument(uuid, document);

        return Documents.readDocument(uuid);
    },

    /**
     *
     * @param {*} questionUuid
     * @param {*} documentUuid
     * @returns
     */
    prepareAnswerFromDocument: async (questionUuid, documentUuid) => {
        // Step #1. Read the question & document data
        const document = Documents.readDocument(documentUuid);
        const question = Questions.readQuestion(questionUuid);

        // Step #2. Going to LLM and generating the answer

        const res1 = await OpenAiRepository.prepareAnswerFromDocument(
            question.text,
            document
        );

        if (!_.isArray(question.usage)) {
            question.usage = [];
        }

        question.usage.push(res1.usage);  // Cost?

        // Now, we got the answer. Let's store it in the db
        Questions.updateQuestion(questionUuid, {
            usage: question.usage,
            answer: res1.output
        });

        return res1.output;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    analyzeMessageContent: async (uuid) => {
        // Step #1. Read the message data
        const message = await Messages.readMessage(uuid);

        if (!_.isArray(message.questions) || message.questions.length === 0) {
            // Step #2. Preparing the list of questions that come from the message
            const res1 = await OpenAiRepository.prepareQuestionListFromMessage(
                message.text
            );

            message.usage = [res1.usage];  // Cost?

            if (res1.output.length > 0) {
                // Prepare the list of embeddings for each question
                const res2 = await OpenAiRepository.prepareQuestionListEmbedding(
                    res1.output
                );

                // Updating usage
                message.usage.push(res2.usage);

                // Resetting list of questions for the message
                message.questions = [];

                // Create list of all questions
                for(let i = 0; i < res2.output.length; i++) {
                    const q = await Questions.createQuestion({
                        text: res2.output[i].text,
                        origin: `/messages/${uuid}`,
                        embedding: res2.output[i].embedding
                    });

                    message.questions.push(q.uuid);
                }
            }

            // Save what we have so far
            Messages.updateMessage(uuid, message);
        }

        // Read the message again so we can analyze the potential candidates
        return Messages.readMessage(uuid);
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    generateMessageAnswer: async (uuid) => {
        // Step #1. Read the message data
        const message = await Messages.readMessage(uuid);

        // Compile all the necessary information for answer generation
        const material = [];

        _.forEach(message.questions, (question) => {
            material.push(..._.map(question.candidates, (c) => ({
                uuid: c.uuid,
                name: c.name,
                text: c.text,
                // Duplicating this, so the question can be included in the
                // QUESTIONS TO ANSWER section inside the prompt
                question: question.text
            })));
        });

        // Verify that we have all the necessary information to prepare the answer
        if (material.length > 0) {
            const res1 = await OpenAiRepository.prepareAnswerForMessage(
                message.text,
                _.unionBy(material, 'uuid')
            );

            message.answer = res1.output;

            if (!_.isArray(message.usage)) {
                message.usage = [];
            }

            message.usage.push(res1.usage);  // Cost?

            // Save what we have so far
            Messages.updateMessage(uuid, {
                answer: message.answer,
                usage: message.usage
            });
        }

        return message;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     */
    fineTuneQuestion: async (uuid, data) => {
        // Step #1. Read question data and update it based on incoming values
        const question = Questions.readQuestion(uuid);

        // We should allow updating only two question properties during fine-tuning
        // process
        question.answer    = data.answer;
        question.ft_method = data.ft_method;

        // Step #2. Indexing the question if it not yet indexed
        if (!_.isArray(question.embedding)) {
            const res1 = await OpenAiRepository.prepareTextEmbedding(question.text);

            if (!_.isArray(question.usage)) {
                question.usage = [];
            }

            // Add usage to the question
            question.usage.push(res1.usage);

            // Add embedding
            question.embedding = res1.output.embedding;

            // Index question
            await DbRepository.indexQuestion(uuid, question.embedding);
        }

        // Step #3. If this is a deep learning, then queue the question for the
        // model fine-tuning
        if (data.ft_method === 'deep') {
            question.ft_batch_uuid = await Tuning.queue(uuid);
        }

        // Step #4. Finally store all the changes to the question
        Questions.updateQuestion(uuid, question);
    },

}