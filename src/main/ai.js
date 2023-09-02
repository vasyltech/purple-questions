const _ = require('lodash');

import OpenAiRepository from './repository/openai';
import Documents from './documents';
import Questions from './questions';
import Messages from './messages'

export default {

    /**
     * Analyze document content and convert it to the list of questions
     *
     * @param {String} uuid
     *
     * @returns {Promise<Document>}
     */
    analyzeDocumentContent: async (uuid) => {
        // Step #1. Read the document data
        const document = Documents.readDocument(uuid);

        // Step #2. Generate the list of questions from the document
        const res1 = await OpenAiRepository.prepareQuestionListFromDocument(
            document
        );

        // Prepare document for indexing
        document.questions = res1.output.map(q => ({
            text: q
        })); // List of generated questions

        // document.corpus = res1.corpus; // What did we send to OpenAI?
        document.usage     = [res1.usage];  // Cost?

        // Updating the document with all the info
        Documents.updateDocument(uuid, document);

        return document;
    },

    /**
     *
     * @param {*} text
     * @param {*} uuid
     */
    indexDocumentQuestion: async (text, uuid) => {
        // Prepare the object for the new question
        const question = {
            text,
            origin: `/documents/${uuid}`,
            usage: []
        };

        // Step #1. Prepare the vector embedding for the question
        const res1 = await OpenAiRepository.prepareTextEmbedding(text);

        // Add usage to the question
        question.usage.push(res1.usage);

        // Step #2. Generate the answer for the question based on document's material
        const document = Documents.readDocument(uuid);
        const res2     = await OpenAiRepository.prepareAnswerFromDocument(
            question.text, document
        );

        // Add usage to the document
        question.usage.push(res2.usage);

        // Now we have all the necessary information to store the question in the
        // document
        question.answer    = res2.output;
        question.embedding = res1.output.embedding;

        // Index the question
        const result = Questions.createQuestion(question);

        // Return enriched question back
        return {
            uuid: result.uuid,
            text,
            answer: question.answer
        }
    },

    /**
     *
     * @param {*} messageUuid
     * @param {*} text
     * @param {*} answer
     * @returns
     */
    indexMessageQuestion: async (messageUuid, text, answer) => {
        // Read the message data
        const message  = await Messages.readMessage(messageUuid);
        const question = _.first(
            _.filter(message.questions, (q) => q.text === text)
        );

        // Create and index the question
        return await Questions.createQuestion({
            text: question.text,
            origin: `/messages/${messageUuid}`,
            answer: answer.trim(), // TODO: Should rewrite with Open AI?
            embedding: question.embedding,
            usage: []
        });
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

            // Part of the result is a complete rewrite of the original message
            message.rewrite = res1.output.rewrite;
            // document.corpus = res1.corpus; // What did we send to OpenAI?
            message.usage   = [res1.usage];  // Cost?

            // Save what we have so far
            Messages.updateMessage(uuid, message);

            if (res1.output.questions.length > 0) {
                // Prepare the list of embeddings for each question
                const res2 = await OpenAiRepository.prepareQuestionListEmbedding(
                    res1.output.questions
                );

                // Updating usage
                message.usage.push(res2.usage);

                // Add all the questions & embedding
                message.questions = res2.output;

                // Updating the message with usage info
                Messages.updateMessage(uuid, message);
            }
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
        const material = _.filter(message.questions, (q) => q.candidate.answer).map(c => ({
            // TODO: Note! We are using the generated from user message question
            // as alias to a similar question that is identified as a candidate
            // Not sure if we need to pass the actual c.candidate.text instead
            question: c.text,
            answer: c.candidate.answer
        }));

        // Verify that we have all the necessary information to prepare the answer
        if (material.length > 0) {
            const res1 = await OpenAiRepository.prepareAnswerForMessage(
                message.rewrite, // TODO: Should we use the original message instead?
                material
            );

            message.answer = res1.output;
            // document.corpus = res1.corpus; // What did we send to OpenAI?
            message.usage.push(res1.usage);  // Cost?

            // Save what we have so far
            Messages.updateMessage(uuid, message);
        }

        return message;
    }

}