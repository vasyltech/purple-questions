const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');

import DbRepository from './repository/db';
import Questions from './questions';
import Settings from './settings';

/**
 * Get the base path to the messages directory
 *
 * @returns {String}
 */
function GetMessagesBasePath(append = null) {
    const basePath = Path.join(
        Settings.getSetting('appDataFolder', app.getPath('userData')),
        'store/messages'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the message index
        Fs.writeFileSync(Path.join(basePath, '.index'), '[]');
    }

    return append ? Path.join(basePath, append) : append;
}

/**
 * Message index
 */
const MessageIndex = (() => {

    let index = null;

    /**
     *
     * @returns
     */
    function Read(reload = false) {
        if (_.isNull(index) || reload) {
            const filePath = GetMessagesBasePath('.index');

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
     */
    function Save() {
        Fs.writeFileSync(GetMessagesBasePath('.index'), JSON.stringify(index));
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
     * @param {*} uuid
     */
    function Remove(uuid) {
        index = Read().filter(m => m.uuid !== uuid);

        Save();
    }

    return {
        get: Read,
        add: Add,
        update: Update,
        remove: Remove
    }
})();

/**
 *
 * @param {*} text
 * @param {*} wCount
 *
 * @returns {String}
 */
function PrepareExcerpt(text, wCount = 30) {
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
    getMessages: (page = 0, limit = 500) => {
        // Cloning the array to avoid issue with reverse
        const index = _.clone(MessageIndex.get(true));
        const start = page * limit;

        return index.reverse().slice(start, start + limit);
    },

    /**
     *
     * @param {*} text
     * @returns
     */
    createMessage: (text) => {
        const uuid     = uuidv4();
        const fullPath = GetMessagesBasePath(uuid);

        const data = {
            text: text.trim(),
            questions: []
        };

        Fs.writeFileSync(fullPath, JSON.stringify(data));

        return MessageIndex.add({
            uuid,
            createdAt: (new Date()).getTime(),
            excerpt: PrepareExcerpt(data.text),
            checksum: Crypto.createHash('md5').update(data.text).digest('hex'),
            status: 'new'
        });
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readMessage: async (uuid) => {
        const message = JSON.parse(
            Fs.readFileSync(GetMessagesBasePath(uuid)).toString()
        );
        const similarity = Settings.getSetting('similarityDistance', 25) / 100;

        const questions = [];

        // Dynamically find the best answer candidates
        for (let i = 0; i < message.questions.length; i++) {
            // Get question data & preparing the list of potential candidates
            const question   = Questions.readQuestion(message.questions[i]);
            const candidates = await PrepareCandidates(question, similarity);

            questions.push({
                uuid: message.questions[i],
                text: question.text,
                answer: question.answer,
                candidates
            });
        }

        message.questions = questions;

        return message;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    indexMessageIdentifiedQuestion: async (uuid) => {
        const message = await Methods.readMessage(uuid);

        return message.questions;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    updateMessage: (uuid, data) => {
        const fullPath   = GetMessagesBasePath(uuid);
        const content    = JSON.parse(Fs.readFileSync(fullPath).toString());
        const newContent = Object.assign({}, content, data);

        Fs.writeFileSync(fullPath, JSON.stringify(newContent));

        // Index file data
        return MessageIndex.update(uuid, {
            updatedAt: (new Date()).getTime(),
            excerpt: PrepareExcerpt(newContent.text),
            checksum: Crypto.createHash('md5').update(newContent.text).digest('hex')
        });
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    updateMessageStatus: (uuid, status) => MessageIndex.update(uuid, {
        status,
        updatedAt: (new Date()).getTime()
    }),

    /**
     *
     * @param {*} uuid
     * @returns
     */
    deleteMessage: async (uuid) => {
         // Delete all indexed questions first
         const message = JSON.parse(
            Fs.readFileSync(GetMessagesBasePath(uuid)).toString()
        );

        // Delete all the questions associated with the document
        for (let i = 0; i < message.questions.length; i++) {
            await Questions.deleteQuestion(message.questions[i]);
        }

        // Delete the message from index
        MessageIndex.remove(uuid);

        // Delete the message file
        const fullPath = GetMessagesBasePath(uuid);

        if (Fs.existsSync(fullPath)) {
            Fs.unlinkSync(fullPath);
        }

        return true;
    }

}

export default Methods;