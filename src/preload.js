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
            updateFile: (path, data) => ipcRenderer.invoke(
                'directory', ['updateFile', path, data]
            ),
        },
        settings: {
            readSettings: () => ipcRenderer.invoke(
                'settings', ['readSettings']
            ),
            saveSettings: (settings) => ipcRenderer.invoke(
                'settings', ['saveSettings', settings]
            )
        },
        ai: {
            analyzeFileContent: (path) => ipcRenderer.invoke(
                'ai', ['analyzeFileContent', path]
            ),
            analyzeMessageContent: (uuid) => ipcRenderer.invoke(
                'ai', ['analyzeMessageContent', uuid]
            )
        },
        messages: {
            getMessages: (page, limit) => ipcRenderer.invoke(
                'messages', ['getMessages', page, limit]
            ),
            createMessage: (message) => ipcRenderer.invoke(
                'messages', ['createMessage', message]
            ),
            readMessage: (uuid) => ipcRenderer.invoke(
                'messages', ['readMessage', uuid]
            )
        }
    }
);