const { v4: uuidv4 } = require('uuid');

import OpenAiRepository from './repository/openai';
import Db from './repository/db';
import Directory from './directory';

export default {

    /**
     *
     * @param {*} path
     */
    analyzeFileContent: async (path) => {
        // Step #1. Read the file/document data
        const document = Directory.readFile(path);

        // Step #2. Generate the list of questions from the document
        const res1 = await OpenAiRepository.prepareQuestionListFromDocument(
            document
        );

        // Prepare document for indexing
        document.questions = []; // List of generated questions
        // document.corpus = res1.corpus; // What did we send to OpenAI?
        document.usage     = [res1.usage];  // Cost?

        // Updating the document with usage info
        Directory.updateFile(path, document);

        // Step #3. Prepare the vector embedding for all the questions
        const res2 = await OpenAiRepository.prepareQuestionListEmbedding(
            res1.output
        );

        // Add usage to the document
        document.usage.push(res2.usage);

        // Step #3. Generate the list of answers for each question and persist the
        // data in the database
        for(let i = 0; i < res2.output.length; i++) {
            const question = res2.output[i];
            const res3     = await OpenAiRepository.prepareAnswerFromDocument(
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
        }

        // Updating the document with all the info
        Directory.updateFile(path, document);

        return document;
    }

}