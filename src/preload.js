const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'purpleCore', {
        documents: {
            getDocumentTree: () => ipcRenderer.invoke(
                'documents', ['getDocumentTree']
            ),
            createFolder: (parentFolder, name) => ipcRenderer.invoke(
                'documents', ['createFolder', parentFolder, name]
            ),
            deleteFolder: (uuid) => ipcRenderer.invoke(
                'documents', ['deleteFolder', uuid]
            ),
            createDocument: (parentFolder, name) => ipcRenderer.invoke(
                'documents', ['createDocument', parentFolder, name]
            ),
            uploadDocument: (parentFolder, documentPath) => ipcRenderer.invoke(
                'documents', ['uploadDocument', parentFolder, documentPath]
            ),
            readDocument: (uuid) => ipcRenderer.invoke(
                'documents', ['readDocument', uuid]
            ),
            deleteDocument: (uuid) => ipcRenderer.invoke(
                'documents', ['deleteDocument', uuid]
            ),
            updateDocument: (uuid, data) => ipcRenderer.invoke(
                'documents', ['updateDocument', uuid, data]
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
            analyzeDocumentContent: (path) => ipcRenderer.invoke(
                'ai', ['analyzeDocumentContent', path]
            ),
            analyzeMessageContent: (uuid) => ipcRenderer.invoke(
                'ai', ['analyzeMessageContent', uuid]
            ),
            indexDocumentQuestion: (question, origin) => ipcRenderer.invoke(
                'ai', ['indexDocumentQuestion', question, origin]
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