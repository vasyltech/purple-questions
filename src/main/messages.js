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
 * @returns
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
    const similar  = await DbRepository.searchQuestions(
        question.embedding, 3
    );

    // Prepare the array of candidates
    const candidates = [];

    _.forEach(similar, (candidate) => {
        if (candidate._distance <= similarity) {
            const q = Questions.readQuestion(candidate.uuid);

            candidates.push({
                uuid: q.uuid,
                text: q.text,
                similarity: Math.round(candidate._distance * 100),
                answer: q.answer
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

        // Dynamically find the best answer candidates
        for (let i = 0; i < message.questions.length; i++) {
            const question = message.questions[i];

            if (!_.isEmpty(question.uuid)) { // Direct answer?
                question.answer = Questions.readQuestion(question.uuid).answer;
            } else {
                question.candidates = await PrepareCandidates(
                    question, similarity
                );
            }
        }

        return message;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} question
     * @returns
     */
    addMessageQuestionReference: (uuid, question) => {
        let result    = false;
        const message = JSON.parse(
            Fs.readFileSync(GetMessagesBasePath(uuid)).toString()
        );

        // Find the question and add reference
        _.forEach(message.questions, (q) => {
            if (q.text === question.text) {
                q.uuid = question.uuid;

                // Yes, we found one
                result = true;
            }
        });

        // Update the question
        Methods.updateMessage(uuid, {
            questions: message.questions
        })

        return result;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} question
     * @returns
     */
    removeMessageQuestionReference: (uuid, question) => {
        let result    = false;
        const message = JSON.parse(
            Fs.readFileSync(GetMessagesBasePath(uuid)).toString()
        );

        // Find the question and add reference
        _.forEach(message.questions, (q) => {
            if (q.uuid === question.uuid) {
                q.uuid = null;

                // Yes, we found one
                result = true;
            }
        });

        // Update the question
        Methods.updateMessage(uuid, {
            questions: message.questions
        })

        return result;
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
    deleteMessage: (uuid) => {
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