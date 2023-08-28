const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');

import OpenAiRepository from './repository/openai';
import Db from './repository/db';
import Documents from './documents';
import Messages from './messages'

export default {

    /**
     * Analyze document content and convert it to the list of questions
     *
     * @param {String} path
     *
     * @returns {Promise<Document>}
     */
    analyzeDocumentContent: async (path) => {
        // Step #1. Read the document data
        const document = Documents.readDocument(path);

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

        // Updating the document with usage info
        // Documents.updateDocument(path, document);

        // // Step #3. Prepare the vector embedding for all the questions
        // const res2 = await OpenAiRepository.prepareQuestionListEmbedding(
        //     res1.output
        // );

        // // Add usage to the document
        // document.usage.push(res2.usage);

        // // Step #3. Generate the list of answers for each question and persist the
        // // data in the database
        // for(let i = 0; i < res2.output.length; i++) {
        //     const question = res2.output[i];
        //     const res3     = await OpenAiRepository.prepareAnswerFromDocument(
        //         question.text, document
        //     );

        //     // Add usage to the document
        //     document.usage.push(res3.usage);

        //     // Generate unique question uuid
        //     const uuid = uuidv4();

        //     // Now we have all the necessary information to store the question in the
        //     // document
        //     document.questions.push({
        //         uuid,
        //         text: question.text,
        //         answer: res3.output,
        //         embedding: question.embedding
        //     });

        //     // Index the question
        //     Db.indexQuestion(path, uuid, question.embedding);
        // }

        // Updating the document with all the info
        Documents.updateDocument(path, document);

        return document;
    },

    indexDocumentQuestion: async (question, origin) => {
        // Prepare the object for the new question
        const content = {
            uuid: uuidv4(),
            text: question,
            origin: `/documents${origin.path}`,
            usage: []
        };

        // Step #1. Prepare the vector embedding for the question
        const res1 = await OpenAiRepository.prepareTextEmbedding(question);

        // Add usage to the question
        content.usage.push(res1.usage);

        // Step #2. Generate the answer for the question and persist the
        // data in the vector database
        const res2 = await OpenAiRepository.prepareAnswerFromDocument(
            question.text, document
        );

        // Add usage to the document
        document.usage.push(res3.usage);

        // Generate unique question uuid
        const uuid = uuidv4();

        // Now we have all the necessary information to store the question in the
        // document
        document.questions.push({
            uuid,
            text: question.text,
            answer: res3.output,
            embedding: question.embedding
        });

        // Index the question
        Db.indexQuestion(path, uuid, question.embedding);
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    analyzeMessageContent: async (uuid) => {
        // Step #1. Read the message data
        const message = Messages.readMessage(uuid);

        if (!_.isArray(message.questions) || message.questions.length === 0) {
            // Step #2. Preparing the list of questions that come from the message
            const res1 = await OpenAiRepository.prepareQuestionListFromMessage(
                message.text
            );

            // Prepare message for indexing
            message.questions = []; // List of generated questions
            // document.corpus = res1.corpus; // What did we send to OpenAI?
            message.usage     = [res1.usage];  // Cost?

            // Updating the message with usage info
            Messages.updateMessage(uuid, message);

            if (res1.output.length > 0) {
                // Prepare the list of embeddings for each question
                const res2 = await OpenAiRepository.prepareQuestionListEmbedding(
                    res1.output
                );

                // Updating usage
                message.usage.push(res2.usage);

                // Prepare the array of questions and metadata associated with each
                // question
                for (let i = 0; i < res2.output.length; i++) {
                    const question  = res2.output[i];
                    const candidate = await Db.searchQuestion(
                        question.embedding, 1
                    );

                    if (!_.isEmpty(candidate)) {
                        const document = Directory.readFile(candidate.document);

                        question.candidate = {
                            document: candidate.document,
                            question: candidate.question,
                            answer: _.filter(
                                document.questions, (q) => q.uuid === candidate.question
                            ).shift().answer
                        };
                    }

                    message.questions.push(question);
                }

                // Updating the message with usage info
                Messages.updateMessage(uuid, message);
            }
        }

        return message;
    }

}