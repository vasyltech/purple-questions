const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');

let QuestionIndex = null;

/**
 * Get the base path to the questions directory
 *
 * @returns {String}
 */
function GetQuestionsBasePath() {
    const basePath = Path.join(app.getPath('userData'), 'store', 'questions');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the questions index
        Fs.writeFileSync(Path.join(basePath, '.index'), '{}');
    }

    return basePath;
}

/**
 *
 * @returns
 */
function GetQuestionIndex() {
    if (_.isNull(QuestionIndex)) {
        const filePath = Path.join(GetQuestionsBasePath(), '.index');

        QuestionIndex = [];

        if (Fs.existsSync(filePath)) {
            QuestionIndex = JSON.parse(Fs.readFileSync(filePath).toString());
        }
    }

    return QuestionIndex;
}

/**
 *
 * @param {*} uuid
 * @param {*} data
 */
function AddToMessageIndex(data) {
    const index = GetMessageIndex();

    index.push(data);

    Fs.writeFileSync(
        Path.join(GetMessagesBasePath(), '.index'),
        JSON.stringify(index)
    );
}

/**
 *
 * @param {*} message
 */
function UpdateMessageIndex(message) {
    const index = GetMessageIndex();

    _.forEach(index, (m, i) => {
        if (m.uuid === message.uuid) {
            index[i] = Object.assign({}, m, message);
        }
    });

    Fs.writeFileSync(
        Path.join(GetMessagesBasePath(), '.index'),
        JSON.stringify(index)
    );
}

/**
 *
 * @param {*} uuid
 */
function RemoveFromMessageIndex(uuid) {
    const index = GetMessageIndex().filter(r = r.uuid !== uuid);

    Fs.writeFileSync(
        Path.join(GetMessagesBasePath(), '.index'),
        JSON.stringify(index)
    );
}

export default {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getQuestions: (page = 0, limit = 500) => {
        const index = GetQuestionIndex();
        const start = page * limit;

        return index.reverse().slice(start, start + limit);
    },

    /**
     *
     * @param {*} message
     * @returns
     */
    indexQuestion: (question, source) => {
        const basePath = GetQuestionsBasePath();
        const uuid     = uuidv4();
        const fullPath = Path.join(basePath, uuid);

        const data     = {
            createdAt: (new Date()).getTime(),
            text: question.trim()
        };

        Fs.writeFileSync(fullPath, JSON.stringify(data));

        // Index message
        AddToMessageIndex({
            uuid,
            createdAt: data.createdAt,
            excerpt: data.excerpt,
            checksum: Crypto.createHash('md5').update(data.text).digest('hex'),
            status: data.status
        });

        return Object.assign({ uuid }, data);
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readMessage: (uuid) => {
        const basePath = GetMessagesBasePath();
        const fullPath = Path.join(basePath, uuid);

        return JSON.parse(Fs.readFileSync(fullPath).toString());
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    updateMessage: (uuid, data) => {
        const basePath = GetMessagesBasePath();
        const fullPath = Path.join(basePath, uuid);

        const content    = JSON.parse(Fs.readFileSync(fullPath).toString());
        const newContent = Object.assign({}, content, data, {
            updatedAt: (new Date()).getTime()
        });

        Fs.writeFileSync(fullPath, JSON.stringify(newContent));

        // Index file data
        UpdateMessageIndex({
            uuid,
            updatedAt: newContent.createdAt,
            excerpt: PrepareExcerpt(newContent.text),
            checksum: Crypto.createHash('md5').update(newContent.text).digest('hex')
        });

        return newContent;
    }

}