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
            createFromFile: (parentFolder, documentPath) => ipcRenderer.invoke(
                'documents', ['createFromFile', parentFolder, documentPath]
            ),
            createFromUrl: (parentFolder, url, selector) => ipcRenderer.invoke(
                'documents', ['createFromUrl', parentFolder, url, selector]
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
            deleteQuestionFromDocument: (uuid, question) => ipcRenderer.invoke(
                'documents', ['deleteQuestionFromDocument', uuid, question]
            ),
            addQuestionToDocument: (uuid, question) => ipcRenderer.invoke(
                'documents', ['addQuestionToDocument', uuid, question]
            ),
        },
        questions: {
            getQuestions: (page, limit) => ipcRenderer.invoke(
                'questions', ['getQuestions', page, limit]
            ),
            readQuestion: (uuid) => ipcRenderer.invoke(
                'questions', ['readQuestion', uuid]
            ),
            updateQuestion: (uuid, data) => ipcRenderer.invoke(
                'questions', ['updateQuestion', uuid, data]
            ),
            deleteQuestion: (uuid) => ipcRenderer.invoke(
                'questions', ['deleteQuestion', uuid]
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
            getModelList: () => ipcRenderer.invoke(
                'ai', ['getModelList']
            ),
            analyzeDocumentContent: (uuid, merge) => ipcRenderer.invoke(
                'ai', ['analyzeDocumentContent', uuid, merge]
            ),
            analyzeMessageContent: (uuid) => ipcRenderer.invoke(
                'ai', ['analyzeMessageContent', uuid]
            ),
            generateMessageAnswer: (uuid) => ipcRenderer.invoke(
                'ai', ['generateMessageAnswer', uuid]
            ),
            prepareAnswerFromDocument: (question, uuid) => ipcRenderer.invoke(
                'ai', ['prepareAnswerFromDocument', question, uuid]
            ),
            fineTuneQuestion: (uuid, data) => ipcRenderer.invoke(
                'ai', ['fineTuneQuestion', uuid, data]
            )
        },
        messages: {
            getMessages: (page, limit) => ipcRenderer.invoke(
                'messages', ['getMessages', page, limit]
            ),
            createMessage: (text) => ipcRenderer.invoke(
                'messages', ['createMessage', text]
            ),
            readMessage: (uuid) => ipcRenderer.invoke(
                'messages', ['readMessage', uuid]
            ),
            indexMessageIdentifiedQuestion: (uuid) => ipcRenderer.invoke(
                'messages', ['indexMessageIdentifiedQuestion', uuid]
            ),
            updateMessage: (uuid, data) => ipcRenderer.invoke(
                'messages', ['updateMessage', uuid, data]
            ),
            deleteMessage: (uuid) => ipcRenderer.invoke(
                'messages', ['deleteMessage', uuid]
            ),
            updateMessageStatus: (uuid, status) => ipcRenderer.invoke(
                'messages', ['updateMessageStatus', uuid, status]
            ),
        }
    }
);