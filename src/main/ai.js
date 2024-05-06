const _    = require('lodash');
const Path = require('path');

const OpenAiRepository = require(Path.resolve(__dirname, 'repository/openai'));
const DbRepository     = require(Path.resolve(__dirname, 'repository/db'));
const Documents        = require(Path.resolve(__dirname, 'documents'));
const Questions        = require(Path.resolve(__dirname, 'questions'));
const Conversations    = require(Path.resolve(__dirname, 'conversations'));
const Tuning           = require(Path.resolve(__dirname, 'tuning'));
const Convertor        = require(Path.resolve(__dirname, 'libs/convertor'));

module.exports = {

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
        const res1 = await OpenAiRepository.prepareQuestionListFromDocument({
            name: document.name,
            text: Convertor.toMd(document.text)
        });

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
     * Prepare the answer to the question based on document's material
     *
     * @param {String} questionUuid
     * @param {String} questionText
     * @param {String} documentUuid
     *
     * @returns {Promise<String>}
     */
    prepareAnswerFromDocument: async (questionUuid, questionText, documentUuid) => {
        // Step #1. Read the question & document data
        const document = Documents.readDocument(documentUuid);
        const question = Questions.readQuestion(questionUuid);

        // Step #2. Going to LLM and generating the answer
        const res1 = await OpenAiRepository.prepareAnswerFromDocument(
            questionText,
            Convertor.toMd(document.text)
        );

        if (!_.isArray(question.usage)) {
            question.usage = [];
        }

        question.usage.push(res1.usage);  // Cost?

        // Convert answer to HTML
        const answer = Convertor.toHtml(res1.output);

        // Now, we got the answer. Let's store it in the db
        Questions.updateQuestion(questionUuid, {
            usage: question.usage,
            text: questionText,
            answer
        });

        return answer;
    },

    /**
     * Prepare answer from selected candidates
     *
     * @param {Object} question
     * @param {Array}  candidates
     *
     * @returns {Promise<String>}
     */
    prepareAnswerFromCandidates: async (question, candidates) => {
        // Step #1. Preparing all the necessary information
        const q    = Questions.readQuestion(question.uuid);
        const list = candidates.map(uuid => Questions.readQuestion(uuid));

        // Step #2. Going to LLM and generating the answer
        const res1 = await OpenAiRepository.prepareAnswerFromCandidates(
            question.text,
            list.map(c => ({
                text: c.text,
                answer: Convertor.toMd(c.answer)
            }))
        );

        if (!_.isArray(q.usage)) {
            q.usage = [];
        }

        q.usage.push(res1.usage);  // Cost?

        // Convert answer to HTML
        const answer = Convertor.toHtml(res1.output);

        // Now, we got the answer. Let's store it in the db
        Questions.updateQuestion(question.uuid, {
            usage: question.usage,
            text: question.text,
            similar_questions: candidates,
            answer
        });

        return answer;
    },

    /**
     * Prepare the conversation context
     *
     * Analyze the first message in the conversation and prepare the context as
     * following:
     *  - Rewrite the initial message to remove unnecessary information, grammar
     *    mistakes and if necessary, translate to English
     *  - Identify the list of questions user is asking to better understand what
     *    is the context/purpose for the conversation
     *
     * @param {String} uuid
     *
     * @returns {Promise<Message>}
     */
    prepareConversationContext: async (uuid) => {
        // Step #1. Read the conversation data
        const conversation = await Conversations.read(uuid);

        // Step #2. Analyze the first message only as this sets the conversation's
        //          context
        const res1 = await OpenAiRepository.prepareQuestionListFromMessage(
            // Take into consideration the scenario when user sends multiple message
            // before we have a chance to analyze and response to them
            _.reduce(conversation.messages, (content, message) => {
                content.push(Convertor.toMd(message.content));

                return content;
            }, []).join('\n\n')
        );

        if (!_.isArray(conversation.usage)) {
            conversation.usage = [];
        }

        conversation.usage.push(res1.usage);  // Cost?

        // The initial messages are rewritten so we can work with clean, grammatically
        // correct message to build the conversation's context
        const rewrite = _.get(res1, 'output.rewrite');

        // Make the rewrite also as part of the conversation's topic list and make
        // sure that the list of questions are unique. We've seen multiple times when
        // rewrite is equal to one of the identified questions.
        const questions = _.uniq([
            rewrite,
            ..._.get(res1, 'output.questions', [])
        ]);

        if (questions.length > 0) {
            // Prepare the list of embeddings for each question
            const res2 = await OpenAiRepository.prepareQuestionListEmbedding(
                questions
            );

            // Updating usage
            conversation.usage.push(res2.usage);

            // Resetting list of questions for the message
            conversation.questions = [];

            // Create list of all questions
            for(let i = 0; i < res2.output.length; i++) {
                const q = await Questions.createQuestion({
                    text: res2.output[i].text,
                    origin: `/conversations/${uuid}`,
                    embedding: res2.output[i].embedding
                });

                conversation.questions.push(q.uuid);
            }
        }

        // Mark the conversation as analyzed
        conversation.isAnalyzed = true;

        // Save what we have so far
        Conversations.update(uuid, conversation);

        // Read the conversation again so we can analyze the potential candidates
        return Conversations.read(uuid);
    },

    /**
     * Compose conversation's answer
     *
     * Take into consideration the entire history of the messages and generate the
     * best possible answer based on the conversation's context
     *
     * @param {String} uuid
     *
     * @returns {Promise<String>}
     */
    composeResponse: async (uuid) => {
        // Step #1. Read the conversation data
        const conversation = await Conversations.read(uuid);

        // Calculate the total number of assistant responses
        const answers = _.filter(
            conversation.messages, (m) => m.role === 'assistant'
        );

        // If this is the first answer, then prepare whole context in request
        // Otherwise, just continue the conversation as user maybe asks for
        // clarifications
        if (answers.length === 0) {
            // Compile all the necessary information for answer generation
            const material = [];

            _.forEach(conversation.questions, (question) => {
                // Now, if question has an answer, include it. Otherwise, can't do :(
                if (!_.isEmpty(question.answer)) {
                    material.push({
                       uuid: question.uuid,
                       question: question.text,
                       answer: Convertor.toMd(question.answer)
                    });
                }
            });

            // Verify that we have all the necessary information to prepare the answer
            if (material.length > 0) {
                const res1 = await OpenAiRepository.composeInitialAnswerForMessage(
                    // Take into consideration the scenario when user sends multiple
                    // message before we have a chance to analyze and response to them
                    _.reduce(conversation.messages, (content, message) => {
                        content.push(Convertor.toMd(message.content));

                        return content;
                    }, []).join('\n\n'),
                    _.unionBy(material, 'uuid')
                );

                if (!_.isArray(conversation.usage)) {
                    conversation.usage = [];
                }

                conversation.usage.push(res1.usage);  // Cost?

                // Add corpus to the all initial messages, so we can build the
                // conversation history
                _.map(conversation.messages, (m) => {
                    m.corpus = [];
                });

                // However, add the corpus only to the last one to ensure that
                // we do not duplicate the conversation's history if there are more
                // then one user message before we had a chance to answer
                _.last(conversation.messages).corpus = res1.corpus;

                // Adding response as the draft answer to the conversation
                conversation.draftAnswer = Convertor.toHtml(res1.output);
            }
        } else {
            // Compile the conversation history and send it to LLM to compile the
            // answer
            const history = [];

            _.forEach(conversation.messages, (message) => {
                if (!_.isUndefined(message.corpus)) {
                    history.push(...message.corpus);
                } else {
                    history.push({
                        content: message.content,
                        role: message.role,
                        name: _.isString(message.name) ? message.name : undefined
                    });
                }
            });

            const res1 = await OpenAiRepository.prepareAnswerFromHistory(history);

            conversation.usage.push(res1.usage);  // Cost?

            // Adding response as the draft answer to the conversation
            conversation.draftAnswer = Convertor.toHtml(res1.output);
        }

        // Save what we have so far
        Conversations.update(uuid, {
            messages: conversation.messages,
            usage: conversation.usage,
            draftAnswer: conversation.draftAnswer
        });

        return conversation.draftAnswer;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     */
    fineTuneQuestion: async (uuid, data = {}) => {
        // Step #1. Read question data and update it based on incoming values
        const question = Object.assign({}, Questions.readQuestion(uuid), data);

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
        }

        // Index question
        await DbRepository.indexQuestion(uuid, question.embedding);

        // Step #3. If this is a deep learning, then queue the question for the
        // model fine-tuning
        if (question.ft_method === 'deep') {
            question.ft_batch_uuid = await Tuning.queue(uuid);
        } else if (!question.ft_method) { // Make sure that there is FT method
            question.ft_method = 'shallow';
        }

        // Step #4. Finally store all the changes to the question
        Questions.updateQuestion(uuid, question);
    }

}