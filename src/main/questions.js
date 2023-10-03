const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');

import DbRepository from './repository/db';
import Settings from './settings';

/**
 * Get the base path to the questions directory
 *
 * @returns {String}
 */
function GetQuestionsPath(append = null) {
    const basePath = Path.join(
        Settings.getSetting('appDataFolder', app.getPath('userData')),
        'store/questions'
    );

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the question index
        Fs.writeFileSync(Path.join(basePath, '.index'), '[]');
    }

    return append ? Path.join(basePath, append) : basePath;
}

/**
 *
 */
const QuestionIndex = (() => {

    let index = null;

    /**
     *
     * @returns
     */
    function Read(reload = false) {
        if (_.isNull(index) || reload) {
            const filePath = GetQuestionsPath('.index');

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
        Fs.writeFileSync(GetQuestionsPath('.index'), JSON.stringify(index));
    }

    /**
     *
     * @param {*} question
     */
    function Add(question) {
        Read().push(question);

        Save();

        return question;
    }

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
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

const Methods = {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getQuestions: (page = 0, limit = 500) => {
        // Cloning the array to avoid issue with reverse
        const index = _.clone(QuestionIndex.get(true));
        const start = page * limit;

        return index.reverse().slice(start, start + limit);
    },

    /**
     *
     * @param {Object} data
     *
     * @returns {Question}
     */
    createQuestion: async (data) => {
        // Generate unique ID
        const uuid = uuidv4();

        Fs.writeFileSync(GetQuestionsPath(uuid), JSON.stringify(data));

        // Index the question in the vector store if embedding is included
        if (_.isArray(data.embedding)) {
            await DbRepository.indexQuestion(uuid, data.embedding);
        }

        // Finally, add the question to the index
        return QuestionIndex.add({
            uuid,
            text: data.text,
            createdAt: (new Date()).getTime()
        });
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    updateQuestion: (uuid, data) => {
        const content = JSON.parse(
            Fs.readFileSync(GetQuestionsPath(uuid)).toString()
        );

        // Generate unique ID
        const newContent = Object.assign(
            {},
            content,
            data
        );

        Fs.writeFileSync(GetQuestionsPath(uuid), JSON.stringify(newContent));

        QuestionIndex.update(uuid, {
            updatedAt: (new Date()).getTime()
        });

        return {
            uuid,
            text: newContent.text,
            answer: newContent.answer,
            ft_method: newContent.ft_method,
        }
    },

    /**
     *
     * @param {*} uuid
     *
     * @returns {}
     */
    deleteQuestion: async (uuid) => {
        const path     = GetQuestionsPath(uuid);
        const question = JSON.parse(Fs.readFileSync(path).toString());

        // Delete the actual file
        if (Fs.existsSync(path)) {
            Fs.unlinkSync(GetQuestionsPath(uuid));
        }

        // Remove the question from the vector store if there is embedding
        if (_.isArray(question.embedding)) {
            await DbRepository.deleteQuestion(uuid);
        }

        // Finally remove the question from the index
        QuestionIndex.remove(uuid);
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readQuestion: (uuid) => {
        return JSON.parse(Fs.readFileSync(GetQuestionsPath(uuid)).toString());
    }
}

export default Methods;