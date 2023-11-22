const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');
const TextConvertor  = require('html-to-text');

import DbRepository from './repository/db';
import OpenAiRepository from './repository/openai';
import Questions from './questions';
import Settings from './settings';
import Bridge from './bridge';

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
 *
 * @param {Question} question
 * @param {Number}   similarity
 *
 * @returns
 */
async function PrepareCandidates(question, similarity) {
    const matches = await DbRepository.searchQuestions(question.embedding, 3);

    // Prepare the collection of candidates
    const candidates = [];

    _.forEach(matches, (match) => {
        if (match._distance <= similarity) {
            // Reading the similar question and getting the data
            const similar = Questions.readQuestion(match.uuid);

            // But only get the data if there is an actual answer provided.
            // Note! Question itself can be indexed even if there are no answers.
            // The scenario when question is indexed is when user analyzes the
            // conversation and questions get embedded and indexed automatically
            if (_.isString(similar.answer) && similar.answer.length > 0) {
                candidates.push({
                    uuid: match.uuid,
                    name: similar.text,
                    text: similar.answer,
                    similarity: Math.round(match._distance * 100)
                });
            }
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
     *
     */
    pull: async () => {
        const response = [];
        const results  = await Bridge.triggerHook('pq-pull-messages');

        // Store only new messages/conversations
        if (_.isArray(results)) {
            _.forEach(results, (row) => {
                const conversation = Object.assign({}, row);

                // Do not allow creating duplicates
                if (!ConversationIndex.has(conversation.externalId)) {
                    response.push(Methods.create(conversation));
                }
            });
        }

        return response;
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
        const message = JSON.parse(
            Fs.readFileSync(GetConversationsBasePath(uuid)).toString()
        );
        const similarity = Settings.getAppSetting('similarityDistance', 25) / 100;
        const questions  = [];

        // Dynamically find the best answer candidates
        for (let i = 0; i < message.questions.length; i++) {
            // Get question data & preparing the list of potential candidates
            const question   = Questions.readQuestion(message.questions[i]);
            const candidates = await PrepareCandidates(question, similarity);

            questions.push({
                uuid: message.questions[i],
                text: question.text,
                answer: question.answer,
                ft_method: question.ft_method,
                candidates
            });
        }

        message.questions = questions;

        // Update the message status to "read" if it is still "new"
        const index = ConversationIndex.get(uuid);

        if (index.status === 'new') {
            ConversationIndex.update(uuid, { status: 'read' });

            message.status = 'read';
        } else {
            message.status = index.status;
        }

        return message;
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

export default Methods;