const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');

import Parsers from './parser';

/**
 * Get the path to the documents directory or subdirectory
 *
 * @param {String} append
 *
 * @returns {String}
 */
function GetDocumentsPath(append = null) {
    const basePath = Path.join(app.getPath('userData'), 'store', 'documents');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create the file index
        Fs.writeFileSync(Path.join(basePath, '.index'), JSON.stringify([{
            name: 'Documents',
            uuid: uuidv4(),
            type: 'folder',
            createdAt: (new Date()).getTime(),
            children: []
        }]));
    }

    return append ? Path.join(basePath, append) : basePath;
}

let DocumentIndex = null;

/**
 *
 * @returns
 */
function GetDocumentIndex() {
    if (_.isNull(DocumentIndex)) {
        const filePath = GetDocumentsPath('.index');

        DocumentIndex = [];

        if (Fs.existsSync(filePath)) {
            DocumentIndex = JSON.parse(Fs.readFileSync(filePath).toString());
        }
    }

    return DocumentIndex;
}

/**
 *
 */
function SaveDocumentIndex(index) {
    Fs.writeFileSync(GetDocumentsPath('.index'), JSON.stringify(index));
}

/**
 * Find folder/document by UUID
 *
 * @param {String} uuid
 * @param {Array}  folder
 *
 * @returns {Object}
 */
function FindByUuid(uuid, folder) {
    let response;

    for(let i = 0; i < folder.length; i++) {
        if (folder[i].uuid === uuid) {
            response = folder[i];
        } else if (_.isArray(folder[i].children)) {
            response = FindByUuid(uuid, folder[i].children);
        }

        if (!_.isUndefined(response)) {
            break;
        }
    }

    return response;
}

/**
 * Find folder/document by UUID and delete it
 *
 * @param {String}  uuid
 * @param {Array}   level
 * @param {Boolean} force
 *
 * @returns {Boolean}
 */
function RemoveByUuid(uuid, level, force = false) {
    let response;

    for(let i = 0; i < level.length; i++) {
        if (level[i].uuid === 'uuid') {
            if (
                !_.isUndefined(level[i].children)
                || level[i].children.length === 0
                || force
            ) {
                response = _.unset(level, i);
            } else {
                response = false;
            }
        } else if (_.isArray(level[i].children)) {
            response = FindByUuid(uuid, level[i].children, force);
        }

        if (!_.isUndefined(response)) {
            break;
        }
    }

    return response;
}

export default {

    /**
     *
     * @returns
     */
    getDocumentTree: () => {
        return GetDocumentIndex()[0]; // The first root
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} name
     * @returns
     */
    createFolder: (parentFolder, name) => {
        let response;

        const index = GetDocumentIndex();
        const base  = FindByUuid(parentFolder, index);
        const uuid  = uuidv4();

        if (!_.isUndefined(base)) {
            response = {
                uuid,
                name,
                createdAt: (new Date()).getTime(),
                type: 'folder',
                children: []
            };

            if (_.isArray(base)) {
                base.push(response);
            } else {
                base.children.push(response);
            }

            // Save the changes
            SaveDocumentIndex(index);
        } else {
            response = null;
        }

        return response
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    deleteFolder: (uuid) => {
        const result = RemoveByUuid(uuid, GetDocumentIndex());

        if (result === true) {
            SaveDocumentIndex();
        }

        return result;
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} name
     * @returns
     */
    createDocument: (parentFolder, name) => {
        let response;

        const index = GetDocumentIndex();
        const base  = FindByUuid(parentFolder, index);
        const uuid  = uuidv4();

        if (!_.isUndefined(base)) {
            response = {
                uuid,
                name,
                createdAt: (new Date()).getTime(),
                type: 'document'
            };

            if (_.isArray(base)) {
                base.push(response);
            } else {
                base.children.push(response);
            }

            // Creating a physical file with data
            Fs.writeFileSync(GetDocumentsPath(uuid), JSON.stringify({
                name,
                text: '',
                questions: []
            }));

            // Save the changes
            SaveDocumentIndex(index);
        } else {
            response = null;
        }

        return response;
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} documentPath
     * @returns
     */
    uploadDocument: async (parentFolder, documentPath) => {
        let response;

        const index = GetDocumentIndex();
        const base  = FindByUuid(parentFolder, index);
        const uuid  = uuidv4();

        const attributes = Path.parse(documentPath);
        const extension  = attributes.ext.substring(1).toLowerCase();

        if (!_.isUndefined(Parsers[extension])) {
            const result = await Parsers[extension].parse(
                Fs.readFileSync(documentPath).toString()
            );

            response = {
                uuid,
                name: result.title || 'New Document',
                createdAt: (new Date()).getTime(),
                type: 'document',
                checksum: Crypto.createHash('md5').update(result.text).digest('hex')
            };

            if (_.isArray(base)) {
                base.push(response);
            } else {
                base.children.push(response);
            }

            // Write a physical file
            Fs.writeFileSync(GetDocumentsPath(uuid), JSON.stringify({
                name: response.name,
                text: result.text,
                questions: []
            }));

            // Save the changes
            SaveDocumentIndex(index);
        }

        return response;
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    readDocument: (uuid) => {
        return JSON.parse(Fs.readFileSync(GetDocumentsPath(uuid)).toString());
    },

    /**
     *
     * @param {*} uuid
     * @returns
     */
    deleteDocument: (uuid) => {
        const index  = GetDocumentIndex();
        const result = RemoveByUuid(uuid, index);

        if (result === true) {
            SaveDocumentIndex(index);

            // Remove a physical file. Should I?
            Fs.unlinkSync(GetDocumentsPath(uuid));
        }

        return result;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    updateDocument: (uuid, data) => {
        const index    = GetDocumentIndex();
        const document = FindByUuid(uuid, index);

        if (!_.isUndefined(document)) {
            document.name      = data.name;
            document.updatedAt = (new Date()).getTime();
            document.checksum  = Crypto.createHash('md5').update(data.text).digest('hex');

            // Read old content and merge it with incoming content
            const filepath = GetDocumentsPath(uuid);
            const content  = JSON.parse(Fs.readFileSync(filepath).toString());

            Fs.writeFileSync(GetDocumentsPath(uuid), JSON.stringify(Object.assign(
                {},
                content,
                data
            )));

            SaveDocumentIndex(index);
        }

        return document;
    }

}