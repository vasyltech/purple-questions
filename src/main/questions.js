const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');

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
    }

    return append ? Path.join(basePath, append) : basePath;
}

export default {

    /**
     *
     * @param {Object} data
     *
     * @returns {Question}
     */
    createQuestion: async (data) => {
        // Generate unique ID
        const question = Object.assign(
            {},
            {
                uuid: uuidv4(),
                createdAt: (new Date()).getTime(),
                checksum: Crypto.createHash('md5').update(data.text).digest('hex')
            },
            data
        );

        Fs.writeFileSync(GetQuestionsPath(question.uuid), JSON.stringify(question));

        // Finally index the question
        await DbRepository.indexQuestion(question.uuid, data.embedding);

        return question;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    updateQuestion: async (uuid, data) => {
        const content = JSON.parse(Fs.readFileSync(GetQuestionsPath(uuid)).toString());

        // Generate unique ID
        const newContent = Object.assign(
            {},
            content,
            { updatedAt: (new Date()).getTime() },
            data
        );

        Fs.writeFileSync(GetQuestionsPath(uuid), JSON.stringify(newContent));

        return newContent;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    deleteQuestion: async (uuid) => {
        const path = GetQuestionsPath(uuid);

        if (Fs.existsSync(path)) {
            Fs.unlinkSync(GetQuestionsPath(uuid));
        }

        await DbRepository.deleteQuestion(uuid);
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