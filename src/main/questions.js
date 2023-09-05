const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');

import DbRepository from './repository/db';
import Settings from './settings';
import Documents from './documents';
import Messages from './messages';

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
 * @param {*} origin
 * @param {*} text
 * @param {*} uuid
 */
function AddReferenceToOrigin(origin, text, uuid) {
    if (origin.includes('/documents/')) {
        Documents.addDocumentQuestionReference(
            origin.substring(11),
            {
                uuid,
                text
            }
        );
    } else if (origin.includes('/messages/')) {
        Messages.addMessageQuestionReference(
            origin.substring(10),
            {
                uuid,
                text
            }
        );
    }
}

/**
 *
 * @param {*} origin
 * @param {*} text
 * @param {*} uuid
 */
function RemoveReferenceFromOrigin(origin, text, uuid) {
    if (origin.includes('/documents/')) {
        Documents.removeDocumentQuestionReference(
            origin.substring(11),
            {
                uuid,
                text
            }
        );
    } else if (origin.includes('/messages/')) {
        Messages.removeMessageQuestionReference(
            origin.substring(10),
            {
                uuid,
                text
            }
        );
    }
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

export default {

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

        // Index the question in the vector store
        await DbRepository.indexQuestion(uuid, data.embedding);

        // Update the origin to include the question reference
        if (!_.isEmpty(data.origin)) {
            AddReferenceToOrigin(data.origin, data.text, uuid)
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
    updateQuestion: async (uuid, data) => {
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

        return QuestionIndex.update(uuid, {
            updatedAt: (new Date()).getTime()
        });
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

        // Remove any links associated with the question
        if (question.origin) {
            RemoveReferenceFromOrigin(question.origin, question.text, uuid);
        }

        // Delete the actual file
        if (Fs.existsSync(path)) {
            Fs.unlinkSync(GetQuestionsPath(uuid));
        }

        // Remove the question from the vector store
        await DbRepository.deleteQuestion(uuid);

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