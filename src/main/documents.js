const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');
const Cheerio        = require('cheerio');
const Superagent     = require('superagent');
const Html2Md        = require('html-to-md')

import Parsers from './parser';
import Questions from './questions';
import Settings from './settings';

/**
 * Get the path to the documents directory or subdirectory
 *
 * @param {String} append
 *
 * @returns {String}
 */
function GetDocumentsPath(append = null) {
    const basePath = Path.join(
        Settings.getSetting('appDataFolder', app.getPath('userData')),
        'store/documents'
    );

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

/**
 *
 */
const DocumentIndex = (() => {

    let index = null;

    /**
     *
     * @returns
     */
    function Read(reload = false) {
        if (_.isNull(index) || reload) {
            const filePath = GetDocumentsPath('.index');

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
        Fs.writeFileSync(GetDocumentsPath('.index'), JSON.stringify(index));
    }

    /**
     * Find folder/document by UUID
     *
     * @param {String} uuid
     * @param {Array}  level
     *
     * @returns {Object}
     */
    function Find(uuid, level = null) {
        let response;

        const folder = (_.isNull(level) ? index : level);

        for(let i = 0; i < folder.length; i++) {
            if (folder[i].uuid === uuid) {
                response = folder[i];
            } else if (_.isArray(folder[i].children)) {
                response = Find(uuid, folder[i].children);
            }

            if (!_.isUndefined(response)) {
                break;
            }
        }

        return response;
    }

    /**
     *
     * @param {*} parent
     * @param {*} node
     * @returns
     */
    function Add(parent, node) {
        const base = Find(parent);

        if (_.isArray(base)) {
            base.push(node);
        } else {
            base.children.push(node);
        }

        Save();

        return node;
    }

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    function Update(uuid, data) {
        const node = Find(uuid);

        _.forEach(data, (v, p) => {
            node[p] = v;
        });

        Save();

        return node;
    }

    /**
     * Find folder/document by UUID and delete it
     *
     * @param {String}  uuid
     * @param {Array}   level
     *
     * @returns {Boolean}
     */
    function Remove(uuid, level = null) {
        let response;

        let folder = (_.isNull(level) ? index : level);

        for(let i = 0; i < folder.length; i++) {
            if (folder[i].uuid === uuid) {
                if (
                    _.isUndefined(folder[i].children)
                    || folder[i].children.length === 0
                ) {
                    folder   = _.remove(folder, (n) => n.uuid === uuid);
                    response = true;
                } else {
                    response = false;
                }
            } else if (_.isArray(folder[i].children)) {
                response = Remove(uuid, folder[i].children);
            }

            if (!_.isUndefined(response)) {
                break;
            }
        }

        return response;
    }

    return {
        get: (reload = false) => Read(reload)[0],
        add: Add,
        find: Find,
        save: Save,
        update: Update,
        remove: (uuid) => {
            const result = Remove(uuid);

            if (result === true) {
                Save();
            }

            return result;
        }
    }
})();

const Methods = {

    /**
     *
     * @returns
     */
    getDocumentTree: () => {
        return DocumentIndex.get(true); // The first root
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} name
     * @returns
     */
    createFolder: (parentFolder, name) => DocumentIndex.add(parentFolder, {
        uuid: uuidv4(),
        name,
        createdAt: (new Date()).getTime(),
        type: 'folder',
        children: []
    }),

    /**
     *
     * @param {*} uuid
     * @returns
     */
    deleteFolder: (uuid) => DocumentIndex.remove(uuid),

    /**
     *
     * @param {*} parentFolder
     * @param {*} name
     * @returns
     */
    createDocument: (parentFolder, name) => {
        // Update the index
        const response = DocumentIndex.add(parentFolder,{
            uuid: uuidv4(),
            name,
            createdAt: (new Date()).getTime(),
            type: 'document'
        })

        // Creating a physical file with data
        Fs.writeFileSync(GetDocumentsPath(response.uuid), JSON.stringify({
            name,
            text: '',
            questions: []
        }));

        return response;
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} documentPath
     * @returns
     */
    createFromFile: async (parentFolder, documentPath) => {
        let response;

        const attributes = Path.parse(documentPath);
        const extension  = attributes.ext.substring(1).toLowerCase();

        if (!_.isUndefined(Parsers[extension])) {
            const result = await Parsers[extension].parse(
                Fs.readFileSync(documentPath).toString()
            );

            response = DocumentIndex.add(parentFolder, {
                uuid: uuidv4(),
                name: result.title || 'New Document',
                createdAt: (new Date()).getTime(),
                type: 'document',
                checksum: Crypto.createHash('md5').update(result.text).digest('hex')
            });

            // Write a physical file
            Fs.writeFileSync(GetDocumentsPath(response.uuid), JSON.stringify({
                name: response.name,
                text: result.text,
                origin: {
                    type: 'file',
                    path: documentPath
                },
                questions: []
            }));
        }

        return response;
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} url
     * @param {*} selector
     */
    createFromUrl: async (parentFolder, url, selector = null) => {
        let response;

        try {
            // Fetching page content from provided URL
            const page = await Superagent.get(url);

            // Loading the raw HTML for parsing
            const $ = Cheerio.load(page.text);

            // Convert to markdown
            const title   = $('head > title').text();
            const content = Html2Md($(selector || 'body').html());

            // Cleaning up the content
            const clean = await Parsers.md.parse(content);

            response = DocumentIndex.add(parentFolder, {
                uuid: uuidv4(),
                name: title || 'New Document',
                createdAt: (new Date()).getTime(),
                type: 'document',
                checksum: Crypto.createHash('md5').update(clean.text).digest('hex')
            });

            // Write a physical file
            Fs.writeFileSync(GetDocumentsPath(response.uuid), JSON.stringify({
                name: response.name,
                text: clean.text,
                origin: {
                    type: 'link',
                    link: url
                },
                questions: []
            }));
        } catch (error) {
            // TODO: log the error in the error log
        }

        return response;
    },

    /**
     * Read the document content
     *
     * @param {String} uuid
     *
     * @returns {Document}
     */
    readDocument: (uuid) => {
        const document = JSON.parse(
            Fs.readFileSync(GetDocumentsPath(uuid)).toString()
        );

        // Iterate over the list of questions and get answers
        _.forEach(document.questions, (q) => {
            if (!_.isUndefined(q.uuid) && !_.isNull(q.uuid)) {
                q.answer = Questions.readQuestion(q.uuid).answer;
            }
        });

        return document;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} question
     * @returns
     */
    addDocumentQuestionReference: (uuid, question) => {
        let result     = false;
        const document = Methods.readDocument(uuid);

        // Find the question and add reference
        _.forEach(document.questions, (q) => {
            if (q.text === question.text) {
                q.uuid = question.uuid;

                // Yes, we found one
                result = true;
            }
        });

        // Update the question
        Methods.updateDocument(uuid, {
            questions: document.questions
        })

        return result;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} question
     * @returns
     */
    removeDocumentQuestionReference: (uuid, question) => {
        let result     = false;
        const document = Methods.readDocument(uuid);

        // Find the question and add reference
        _.forEach(document.questions, (q) => {
            if (q.uuid === question.uuid) {
                q.uuid = null;

                // Yes, we found one
                result = true;
            }
        });

        // Update the question
        Methods.updateDocument(uuid, {
            questions: document.questions
        })

        return result;
    },

    /**
     *
     * @param {String}  uuid
     * @param {Boolean} deleteIndexedQuestions
     * @returns
     */
    deleteDocument: async (uuid, deleteIndexedQuestions = false) => {
        // Delete all indexed questions first, if chosen
        if (deleteIndexedQuestions) {
            const document = JSON.parse(
                Fs.readFileSync(GetDocumentsPath(uuid)).toString()
            );

            for (let i = 0; i < document.questions.length; i++) {
                if (_.isString(document.questions[i].uuid)) {
                    await Questions.deleteQuestion(document.questions[i].uuid);
                }
            }
        }

        // Remove index first
        const result = DocumentIndex.remove(uuid);

        // Remove a physical file. Should I?
        const filepath = GetDocumentsPath(uuid);

        if (Fs.existsSync(filepath)) {
            Fs.unlinkSync(filepath);
        }

        return result;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} question
     * @returns
     */
    deleteDocumentQuestion: async (uuid, question) => {
        const document = JSON.parse(
            Fs.readFileSync(GetDocumentsPath(uuid)).toString()
        );

        // Remove the question from the list
        document.questions = _.filter(
            document.questions, (q => q.text !== question.text)
        );

        Methods.updateDocument(uuid, { questions: document.questions });

        // If question is already indexed, delete it as well
        if (_.isString(question.uuid)) {
            await Questions.deleteQuestion(question.uuid);
        }

        return true;
    },

    /**
     *
     * @param {*} uuid
     * @param {*} data
     * @returns
     */
    updateDocument: (uuid, data) => {
        // Read old content and merge it with incoming content
        const filepath   = GetDocumentsPath(uuid);
        const content    = JSON.parse(Fs.readFileSync(filepath).toString());
        const newContent = Object.assign({}, content, data);

        // Update document attributes
        const response = DocumentIndex.update(uuid, {
            name: newContent.name,
            updatedAt: (new Date()).getTime(),
            checksum: Crypto.createHash('md5').update(newContent.text).digest('hex')
        });

        // Update the actual file
        Fs.writeFileSync(GetDocumentsPath(uuid), JSON.stringify(newContent));

        return response;
    }

}

export default Methods;