const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const TextConvertor  = require('html-to-text');

const DbRepository     = require(Path.resolve(__dirname, 'repository/db'));
const OpenAiRepository = require(Path.resolve(__dirname, 'repository/openai'));
const Questions        = require(Path.resolve(__dirname, 'questions'));
const Settings         = require(Path.resolve(__dirname, 'settings'));
const Bridge           = require(Path.resolve(__dirname, 'bridge'));

/**
 * Get the base path to the conversations directory
 *
 * @returns {String}
 */
function GetConversationsBasePath(append = null) {
    const basePath = Path.join(
        Settings.getAppSetting('appDataFolder', app.getPath('userData')),
        'store/conversations'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the message index
        Fs.writeFileSync(Path.join(basePath, '.index'), '[]');
    }

    return append ? Path.join(basePath, append) : append;
}

/**
 * Conversation index
 */
const ConversationIndex = (() => {

    let index = null;

    /**
     *
     * @returns
     */
    function Read(reload = false) {
        if (_.isNull(index) || reload) {
            const filePath = GetConversationsBasePath('.index');

            if (Fs.existsSync(filePath)) {
                index = JSON.parse(Fs.readFileSync(filePath).toString());
            } else {
                index = [];
            }
        }

        return index;
    }

    /**
     *
     * @param {*} uuid
     * @returns
     */
    function ReadOne(uuid) {
        return Read().filter(m => m.uuid === uuid).shift();
    }

    /**
     *
     */
    function Save() {
        Fs.writeFileSync(GetConversationsBasePath('.index'), JSON.stringify(index));
    }

    /**
     *
     * @param {*} message
     */
    function Add(message) {
        Read().push(message);

        Save();

        return message;
    }

    /**
     *
     * @param {*} message
     */
    function Update(uuid, data) {
        let response;

        const list = Read();

        for (let i = 0; i < list.length; i++) {
            if (list[i].uuid === uuid) {
                list[i]  = Object.assign({}, list[i], data);
                response = list[i];

                break;
            }
        }

        Save();

        return response;
    }

    /**
     *
     * @param {*} id
     * @returns
     */
    function Has(id) {
        return Read().filter(m => [m.uuid, m.externalId].includes(id)).length > 0;
    }

    /**
     *
     * @param {*} uuid
     */
    function Remove(uuid) {
        index = Read().filter(m => m.uuid !== uuid);

        Save();
    }

    return {
        getAll: Read,
        get: ReadOne,
        add: Add,
        update: Update,
        remove: Remove,
        has: Has
    }
})();

/**
 *
 * @param {*} html
 * @param {*} wCount
 *
 * @returns {String}
 */
function PrepareExcerpt(html, wCount = 30) {
    const text  = TextConvertor.convert(html);
    const parts = text.split(/\r\n|\n|\s|\t/g).filter(p => p.trim().length > 0);

    return parts.slice(0, wCount).join(' ') + (parts.length > wCount ? '...' : '');
}

/**
 * Get list of most closest candidates
 *
 * @param {Question} question
 * @param {Number}   quantity
 *
 * @returns {Promise<Array>}
 */
async function PrepareCandidates(question, quantity) {
    const matches = await DbRepository.searchQuestions(question.embedding, quantity);

    // Prepare the collection of candidates
    const candidates = [];

    _.forEach(matches, (match) => {
        // Reading the similar question and getting the data
        const similar = Questions.readQuestion(match.uuid);

        // But only get the data if there is an actual answer provided.
        // Note! Question itself can be indexed even if there are no answers.
        // The scenario when question is indexed is when user analyzes the
        // conversation and questions get embedded and indexed automatically
        if (_.isString(similar.answer) && similar.answer.length > 0) {
            const distance = Math.round(match._distance * 100);

            candidates.push({
                uuid: match.uuid,
                name: similar.text,
                text: similar.answer,
                distance: distance > 100 ? 100 : distance
            });
        }
    });

    return candidates;
}

const Methods = {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getList: (page = 0, limit = 500) => {
        // Cloning the array to avoid issue with reverse
        const index = _.clone(ConversationIndex.getAll(true));
        const start = page * limit;

        return index.reverse().slice(start, start + limit);
    },

    /**
     * Pull new conversations from external sources
     *
     * @return {Promise<Array>}
     */
    pull: async () => {
        const response = [];
        const results  = await Bridge.triggerHook('pq-pull-messages');

        // Store only new messages/conversations
        if (_.isArray(results)) {
            _.forEach(results, (row) => {
                const conversation = Object.assign({}, row);

                // Making sure that we have UUID attached to each message
                _.forEach(conversation.messages, (message) => {
                    message.id = uuidv4();
                });

                // Do not allow creating duplicates
                if (!ConversationIndex.has(conversation.externalId)) {
                    response.push(Methods.create(conversation));
                }
            });
        }

        return response;
    },

    /**
     * Reply for the conversation
     *
     * @param {String} uuid
     * @param {String} answer
     *
     * @returns {Promise<Conversation>}
     */
    reply: async (uuid, answer) => {
        const path         = GetConversationsBasePath(uuid);
        const conversation = JSON.parse(Fs.readFileSync(path).toString());

        // If we are adding the first assistant message to the conversation, then
        // assume this is as the answer to the first conversation's topic. Remember,
        // the first topic in the list of conversation "questions" is always the
        // rewrite of initial user message(s)
        const total = _.filter(
            conversation.messages, (m) => m.role === 'assistant'
        ).length;

        // Did we actually analyze the conversation for the context already or not?
        if (total === 0 && conversation.questions.length > 0) {
            const question = Questions.readQuestion(conversation.questions[0]);

            // Update the direct answer to the first topic ONLY if it does not have
            // the answer yet. This way we are covering the scenarios when the actual
            // composed reply was generated by selecting "Compose Response" button
            if (!question.answer) {
                Questions.updateQuestion(conversation.questions[0], {
                    answer
                });

                // Fine-tune the question as well
                await require(Path.resolve(__dirname, 'ai')).fineTuneQuestion(
                    conversation.questions[0]
                );
            }
        }

        // Convert the answer into the message and delete the draftAnswer
        conversation.messages.push({
            id: uuidv4(),
            content: answer,
            role: 'assistant',
            name: Settings.getAppSetting('persona.name')
        });

        Methods.update(uuid, {
            messages: conversation.messages,
            draftAnswer: undefined
        });

        // await Bridge.triggerHook(
        //     'pq-message-send',
        //     {
        //         email: _.get(conversation, 'metadata.userEmail'),
        //         content: answer
        //     }
        // );

        return Methods.read(uuid);
    },

    /**
     *
     * @param {*} text
     * @returns
     */
    createFromText: (text) => {
        return Methods.create({
            messages: [{
                content: text,
                role: 'user',
                name: 'You',
                id: uuidv4()
            }]
        })
    },

    /**
     *
     * @param {*} data
     *
     * @returns
     */
    create: (data) => {
        const uuid         = uuidv4();
        const fullPath     = GetConversationsBasePath(uuid);
        const conversation = Object.assign({ uuid }, data, { questions: [] });

        Fs.writeFileSync(fullPath, JSON.stringify(conversation));

        return ConversationIndex.add({
            uuid,
            externalId: data.externalId,
            createdAt: (new Date()).getTime(),
            excerpt: PrepareExcerpt(conversation.messages[0].content),
            status: 'new'
        });
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    read: async (uuid) => {
        const conversation = JSON.parse(
            Fs.readFileSync(GetConversationsBasePath(uuid)).toString()
        );
        const quantity  = Settings.getAppSetting('similarityCandidates', 5);
        const questions = [];

        // Dynamically find the best answer candidates
        for (let i = 0; i < conversation.questions.length; i++) {
            // Get question data & preparing the list of potential candidates
            const question   = Questions.readQuestion(conversation.questions[i]);
            const candidates = await PrepareCandidates(question, quantity);

            questions.push({
                uuid: conversation.questions[i],
                text: question.text,
                answer: question.answer,
                ft_method: question.ft_method,
                candidates
            });
        }

        conversation.questions = questions;

        // Update the message status to "read" if it is still "new"
        const index = ConversationIndex.get(uuid);

        if (index.status === 'new') {
            ConversationIndex.update(uuid, { status: 'read' });

            conversation.status = 'read';
        } else {
            conversation.status = index.status;
        }

        return conversation;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    getTopicList: async (uuid) => {
        const conversation = await Methods.read(uuid);

        return conversation.questions;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} questionUuid
     * @returns
     */
    deleteTopic: async (uuid, questionUuid) => {
        const conversation = JSON.parse(
            Fs.readFileSync(GetConversationsBasePath(uuid)).toString()
        );

        // Remove the question from the list
        conversation.questions = _.filter(
            conversation.questions, (q => q !== questionUuid)
        );

        Methods.update(uuid, { questions: conversation.questions });

        // Now delete the actual question
        await Questions.deleteQuestion(questionUuid);

        return true;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    addTopic: async (uuid, data) => {
        const conversation = JSON.parse(
            Fs.readFileSync(GetConversationsBasePath(uuid)).toString()
        );

        // Embed the message
        const res1 = await OpenAiRepository.prepareTextEmbedding(data.text);

        const question = await Questions.createQuestion({
            text: res1.output.text,
            answer: data.answer || undefined,
            embedding: res1.output.embedding,
            usage: [ res1.usage ]
        });

        conversation.questions.push(question.uuid);
        Methods.update(uuid, { questions: conversation.questions });

        return true;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    update: (uuid, data) => {
        const fullPath     = GetConversationsBasePath(uuid);
        const current      = JSON.parse(Fs.readFileSync(fullPath).toString());
        const conversation = Object.assign({}, current, data);

        Fs.writeFileSync(fullPath, JSON.stringify(conversation));

        // Index file data
        return ConversationIndex.update(uuid, {
            updatedAt: (new Date()).getTime(),
            excerpt: PrepareExcerpt(conversation.messages[0].content)
        });
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    updateStatus: (uuid, status) => ConversationIndex.update(uuid, {
        status,
        updatedAt: (new Date()).getTime()
    }),

    /**
     *
     * @param {*} uuid
     * @returns
     */
    delete: async (uuid) => {
         // Delete all indexed questions first
         const message = JSON.parse(
            Fs.readFileSync(GetConversationsBasePath(uuid)).toString()
        );

        // Delete all the questions associated with the document
        for (let i = 0; i < message.questions.length; i++) {
            await Questions.deleteQuestion(message.questions[i]);
        }

        // Delete the message from index
        ConversationIndex.remove(uuid);

        // Delete the message file
        const fullPath = GetConversationsBasePath(uuid);

        if (Fs.existsSync(fullPath)) {
            Fs.unlinkSync(fullPath);
        }

        return true;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} messageId
     * @returns
     */
    deleteMessage: async (uuid, messageId) => {
        const fullPath     = GetConversationsBasePath(uuid);
        const conversation = JSON.parse(Fs.readFileSync(fullPath).toString());

        conversation.messages = _.filter(
            conversation.messages, (m) => m.id !== messageId
        );

        Fs.writeFileSync(fullPath, JSON.stringify(conversation));

        return true;
    },

    /**
     * Add new message to the conversation
     *
     * @param {String} uuid
     * @param {Object} data
     *
     * @returns {Message}
     */
    addMessage: (uuid, data) => {
        const fullPath     = GetConversationsBasePath(uuid);
        const conversation = JSON.parse(Fs.readFileSync(fullPath).toString());
        const message      = Object.assign({ id: uuidv4() }, data);

        conversation.messages.push(message);

        Fs.writeFileSync(fullPath, JSON.stringify(conversation));

        return message;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} messageId
     * @param {*} data
     * @returns
     */
    updateMessage: async (uuid, messageId, data) => {
        const fullPath     = GetConversationsBasePath(uuid);
        const conversation = JSON.parse(Fs.readFileSync(fullPath).toString());

        _.forEach(conversation.messages, (message, i) => {
            if (message.id === messageId) {
                conversation.messages[i] = Object.assign(
                    {}, conversation.messages[i], data
                );
            }
        });

        Fs.writeFileSync(fullPath, JSON.stringify(conversation));

        return true;
    }

}

module.exports = Methods;