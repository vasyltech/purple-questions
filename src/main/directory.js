const Fs             = require('fs');
const Path           = require('path');
const { app }        = require('electron');
const { v4: uuidv4 } = require('uuid');
const _              = require('lodash');
const Crypto         = require('crypto');

import Parsers from './parser';

/**
 *
 * @param {*} basePath
 * @param {*} name
 */
function CreateFolderSystemFile(basePath, name) {
    Fs.writeFileSync(Path.join(basePath, '.folder'), JSON.stringify({
        name,
        createdAt: (new Date()).getTime()
    }));
}

/**
 * Get the base path to the documents directory
 *
 * @returns {String}
 */
function GetDocumentsBasePath() {
    const basePath = Path.join(app.getPath('userData'), 'store', 'documents');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});

        // Create a regular folder
        CreateFolderSystemFile(basePath, 'Documents');

        // Create the file index
        Fs.writeFileSync(Path.join(basePath, '.index'), '{}');
    }

    return basePath;
}

let FileIndex = null;

/**
 *
 * @returns
 */
function GetFileIndex() {
    if (_.isNull(FileIndex)) {
        const filePath = Path.join(GetDocumentsBasePath(), '.index');

        FileIndex = {};

        if (Fs.existsSync(filePath)) {
            FileIndex = JSON.parse(Fs.readFileSync(filePath).toString());
        }
    }

    return FileIndex;
}

/**
 *
 * @param {*} uuid
 * @param {*} data
 */
function UpdateFileIndex(uuid, data) {
    const index = GetFileIndex();

    index[uuid] = data;

    Fs.writeFileSync(
        Path.join(GetDocumentsBasePath(), '.index'),
        JSON.stringify(index)
    );
}

/**
 *
 * @param {*} uuid
 */
function RemoveFromFileIndex(uuid) {
    const index = GetFileIndex();

    _.unset(index, uuid);

    Fs.writeFileSync(
        Path.join(GetDocumentsBasePath(), '.index'),
        JSON.stringify(index)
    );
}

/**
 *
 * @param {*} uuid
 * @returns
 */
function GetFromFileIndex(uuid) {
    const index = GetFileIndex();

    return _.get(index, uuid, {});
}

/**
 *
 * @param {*} relativePath
 * @returns
 */
function GetDocumentFolderAbsolutePath(relativePath = '') {
    return Path.join(GetDocumentsBasePath(), relativePath);
}

/**
 *
 * @param {*} relativePath
 * @returns
 */
function PrepareDocumentTree(relativePath = '/') {
    const absolutePath = GetDocumentFolderAbsolutePath(relativePath);

    const folder  = {
        name: Path.parse(absolutePath).base,
        path: relativePath,
        type: 'folder',
        isRoot: relativePath === '/',
        children: []
    };

    const directory  = Fs.readdirSync(absolutePath, { withFileTypes: true });
    const attributes = directory.filter((n) => n.name === '.folder').shift();

    if (attributes !== undefined) {
        const metadata = JSON.parse(
            Fs.readFileSync(Path.join(absolutePath, attributes.name)).toString()
        );

        folder.name      = metadata.name; // Replace with actual folder name
        folder.createdAt = metadata.createdAt;
    }

    for(let i = 0; i < directory.length; i++) {
        const file = directory[i];

        if (file.name.charAt(0) !== '.') { // Exclude any system files
            if (file.isDirectory()) {
                folder.children.push(PrepareDocumentTree(
                    Path.join(relativePath, file.name)
                ));
            } else {
                const fileMeta = GetFromFileIndex(file.name);

                folder.children.push({
                    name: fileMeta.name,
                    path: Path.join(relativePath, file.name),
                    createdAt: fileMeta.createdAt,
                    updatedAt: fileMeta.updatedAt,
                    type: 'file'
                });
            }
        }
    }

    return folder;
}

export default {

    /**
     *
     * @returns
     */
    getDocumentTree: () => {
        return PrepareDocumentTree();
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} newFolderName
     * @returns
     */
    createFolder: (parentFolder, newFolderName) => {
        const basePath = GetDocumentsBasePath();
        const uuid     = uuidv4();
        const fullPath = Path.join(basePath, parentFolder, uuid);

        Fs.mkdirSync(fullPath);
        CreateFolderSystemFile(fullPath, newFolderName);

        return {
            name: newFolderName,
            path: Path.join(parentFolder, uuid),
            type: 'folder',
            children: []
        }
    },

    /**
     *
     * @param {*} path
     * @returns
     */
    deleteFolder: (path) => {
        const basePath = GetDocumentsBasePath();
        const fullPath = Path.join(basePath, path);

        Fs.rmSync(fullPath, { recursive: true, force: true});

        return true;
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} fileName
     * @returns
     */
    createFile: (parentFolder, fileName) => {
        const basePath = GetDocumentsBasePath();
        const uuid     = uuidv4();
        const fullPath = Path.join(basePath, parentFolder, uuid);
        const content  = {
            name: fileName,
            createdAt: (new Date()).getTime()
        };

        Fs.writeFileSync(fullPath, JSON.stringify(content));

        // Index file
        UpdateFileIndex(uuid, content);

        return {
            name: fileName,
            path: Path.join(parentFolder, uuid),
            type: 'file'
        }
    },

    /**
     *
     * @param {*} parentFolder
     * @param {*} filePath
     * @returns
     */
    uploadFile: async (parentFolder, filePath) => {
        let response = null;

        const basePath = GetDocumentsBasePath();
        const uuid     = uuidv4();
        const fullPath = Path.join(basePath, parentFolder, uuid);

        const attributes = Path.parse(filePath);
        const extension  = attributes.ext.substring(1).toLowerCase();

        if (!_.isUndefined(Parsers[extension])) {
            const result = await Parsers[extension].parse(
                Fs.readFileSync(filePath).toString()
            );

            const content = {
                name: result.title || 'New File',
                createdAt: (new Date()).getTime(),
                content: result.content
            };

            const checksum = Crypto
                .createHash('md5')
                .update(result.content)
                .digest('hex');

            Fs.writeFileSync(fullPath, JSON.stringify(content));

            // Index file data
            UpdateFileIndex(uuid, {
                name: content.name,
                createdAt: content.createdAt,
                checksum
            });

            response = Object.assign({}, {
                path: Path.join(parentFolder, uuid),
                type: 'file',
            }, content);
        }

        return response;
    },

    /**
     *
     * @param {*} filePath
     * @returns
     */
    readFile: (filePath) => {
        const basePath = GetDocumentsBasePath();
        const fullPath = Path.join(basePath, filePath);
        const response = JSON.parse(Fs.readFileSync(fullPath).toString());

        return response;
    },

    /**
     *
     * @param {*} path
     * @returns
     */
    deleteFile: (path) => {
        const basePath = GetDocumentsBasePath();
        const fullPath = Path.join(basePath, path);
        const uuid     = Path.parse(path).base;

        Fs.unlinkSync(fullPath);

        // Remove the file from index
        RemoveFromFileIndex(uuid);

        return true;
    },

    /**
     *
     * @param {*} path
     * @param {*} data
     * @returns
     */
    updateFile: (path, data) => {
        const basePath = GetDocumentsBasePath();
        const fullPath = Path.join(basePath, path);

        const content    = JSON.parse(Fs.readFileSync(fullPath).toString());
        const newContent = Object.assign({}, content, data, {
            updatedAt: (new Date()).getTime()
        });

        Fs.writeFileSync(fullPath, JSON.stringify(newContent));

        // Update indexed data for the file
        const checksum = Crypto
                .createHash('md5')
                .update(newContent.content)
                .digest('hex');

        // Index file data
        UpdateFileIndex(Path.parse(path).base, {
            name: newContent.name,
            createdAt: newContent.createdAt,
            updatedAt: newContent.createdAt,
            checksum
        });

        return true;
    }

}