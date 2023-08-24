const Fs      = require('fs');
const Path    = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');

/**
 * Get the base path to the documents directory
 *
 * @returns {String}
 */
function GetDocumentsBasePath() {
    const basePath = Path.join(app.getPath('userData'), 'store', 'documents');

    if (!Fs.existsSync(basePath)) {
        Fs.mkdirSync(basePath, { recursive: true});
        Fs.writeFileSync(Path.join(basePath, '.folder'), JSON.stringify({
            name: 'Documents',
            createdAt: (new Date()).toTimeString()
        }));
    }

    return basePath;
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

        if (file.name !== '.folder') {
            if (file.isDirectory()) {
                folder.children.push(PrepareDocumentTree(
                    Path.join(relativePath, file.name)
                ));
            } else {
                // TODO: Rewrite to avoid reading all files one by one
                const fileMeta = JSON.parse(
                    Fs.readFileSync(Path.join(absolutePath, file.name)).toString()
                );

                folder.children.push({
                    name: fileMeta.name,
                    path: Path.join(relativePath, file.name),
                    createdAt: fileMeta.createdAt,
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
        Fs.writeFileSync(Path.join(fullPath, '.folder'), JSON.stringify({
            name: newFolderName
        }));

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

        Fs.writeFileSync(fullPath, JSON.stringify({
            name: fileName,
            createdAt: (new Date()).toTimeString()
        }));

        return {
            name: fileName,
            path: Path.join(parentFolder, uuid),
            type: 'file'
        }
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

        // Recreate the breadcrumb

        return response;
    }

}