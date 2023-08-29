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
            deleteDocument: (uuid, deleteIndexedQuestions) => ipcRenderer.invoke(
                'documents', ['deleteDocument', uuid, deleteIndexedQuestions]
            ),
            updateDocument: (uuid, data) => ipcRenderer.invoke(
                'documents', ['updateDocument', uuid, data]
            ),
            deleteDocumentQuestion: (uuid, question) => ipcRenderer.invoke(
                'documents', ['deleteDocumentQuestion', uuid, question]
            ),
        },
        questions: {
            updateQuestion: (uuid, data) => ipcRenderer.invoke(
                'questions', ['updateQuestion', uuid, data]
            )
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
            analyzeDocumentContent: (uuid) => ipcRenderer.invoke(
                'ai', ['analyzeDocumentContent', uuid]
            ),
            analyzeMessageContent: (uuid) => ipcRenderer.invoke(
                'ai', ['analyzeMessageContent', uuid]
            ),
            indexDocumentQuestion: (text, uuid) => ipcRenderer.invoke(
                'ai', ['indexDocumentQuestion', text, uuid]
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