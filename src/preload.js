const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'purpleCore', {
        directory: {
            getDocumentTree: () => ipcRenderer.invoke(
                'directory', ['getDocumentTree']
            ),
            createFolder: (parentFolder, newFolderName) => ipcRenderer.invoke(
                'directory', ['createFolder', parentFolder, newFolderName]
            ),
            deleteFolder: (path) => ipcRenderer.invoke(
                'directory', ['deleteFolder', path]
            ),
            createFile: (parentFolder, newFileName) => ipcRenderer.invoke(
                'directory', ['createFile', parentFolder, newFileName]
            ),
            uploadFile: (parentFolder, filePath) => ipcRenderer.invoke(
                'directory', ['uploadFile', parentFolder, filePath]
            ),
            readFile: (filePath) => ipcRenderer.invoke(
                'directory', ['readFile', filePath]
            ),
            deleteFile: (path) => ipcRenderer.invoke(
                'directory', ['deleteFile', path]
            ),
        },
        core: {
            readSettings: () => ipcRenderer.invoke(
                'core', ['readSettings']
            ),
            saveSettings: (settings) => ipcRenderer.invoke(
                'core', ['saveSettings', settings]
            )
        }
    }
);