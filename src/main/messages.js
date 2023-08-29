const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');

let MessageIndex = null;

/**
 * Get the base path to the messages directory
 *
 * @returns {String}
 */
function GetMessagesBasePath(append = null) {
    const basePath = Path.join(app.getPath('userData'), 'store', 'messages');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the message index
        Fs.writeFileSync(Path.join(basePath, '.index'), '[]');
    }

    return append ? Path.join(basePath, append) : append;
}

/**
 *
 * @returns
 */
function GetMessageIndex() {
    if (_.isNull(MessageIndex)) {
        const filePath = GetMessagesBasePath('.index');

        MessageIndex = [];

        if (Fs.existsSync(filePath)) {
            MessageIndex = JSON.parse(Fs.readFileSync(filePath).toString());
        }
    }

    return MessageIndex;
}

/**
 *
 * @param {*} uuid
 * @param {*} data
 */
function AddToMessageIndex(data) {
    const index = GetMessageIndex();

    index.push(data);

    Fs.writeFileSync(GetMessagesBasePath('.index'), JSON.stringify(index));
}

/**
 *
 * @param {*} message
 */
function UpdateMessageIndex(message) {
    let response;

    const index = GetMessageIndex();

    _.forEach(index, (m, i) => {
        if (m.uuid === message.uuid) {
            index[i] = Object.assign({}, m, message);
            response = index[i];
        }
    });

    Fs.writeFileSync(GetMessagesBasePath('.index'), JSON.stringify(index));

    return response;
}

/**
 *
 * @param {*} uuid
 */
function RemoveFromMessageIndex(uuid) {
    let index    = GetMessageIndex();
    MessageIndex = index.filter(m => m.uuid !== uuid);

    Fs.writeFileSync(GetMessagesBasePath('.index'), JSON.stringify(MessageIndex));
}

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

export default {

    /**
     *
     * @param {*} page
     * @param {*} limit
     */
    getMessages: (page = 0, limit = 500) => {
        const index = GetMessageIndex();
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

        const message = {
            uuid,
            createdAt: (new Date()).getTime(),
            excerpt: PrepareExcerpt(data.text),
            checksum: Crypto.createHash('md5').update(data.text).digest('hex'),
            status: 'new'
        };

        // Index message
        AddToMessageIndex(message);

        return message;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readMessage: (uuid) => {
        return JSON.parse(Fs.readFileSync(GetMessagesBasePath(uuid)).toString());
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    updateMessage: (uuid, data) => {
        const fullPath = GetMessagesBasePath(uuid);

        const content    = JSON.parse(Fs.readFileSync(fullPath).toString());
        const newContent = Object.assign({}, content, data);

        Fs.writeFileSync(fullPath, JSON.stringify(newContent));

        // Index file data
        return UpdateMessageIndex({
            uuid,
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
    deleteMessage: (uuid) => {
        // Delete the message from index
        RemoveFromMessageIndex(uuid);

        // Delete the message file
        const fullPath = GetMessagesBasePath(uuid);

        if (Fs.existsSync(fullPath)) {
            Fs.unlinkSync(fullPath);
        }

        return true;
    },

}