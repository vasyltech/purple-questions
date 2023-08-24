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
            readFile: (filePath) => ipcRenderer.invoke(
                'directory', ['readFile', filePath]
            )
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