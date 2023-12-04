const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'purpleCore', {
        documents: {
            getDocumentTree: () => ipcRenderer.invoke(
                'documents', ['getDocumentTree']
            ),
            getDocumentList: (type) => ipcRenderer.invoke(
                'documents', ['getDocumentList', type]
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
            )
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
            linkQuestion: (uuid, documents) => ipcRenderer.invoke(
                'questions', ['linkQuestion', uuid, documents]
            ),
            deleteQuestion: (uuid) => ipcRenderer.invoke(
                'questions', ['deleteQuestion', uuid]
            ),
        },
        settings: {
            getAppSettings: () => ipcRenderer.invoke(
                'settings', ['getAppSettings']
            ),
            getAppSetting: (setting) => ipcRenderer.invoke(
                'settings', ['getAppSetting', setting]
            ),
            saveAppSettings: (settings) => ipcRenderer.invoke(
                'settings', ['saveAppSettings', settings]
            )
        },
        ai: {
            getLlmModelList: () => ipcRenderer.invoke(
                'ai', ['getLlmModelList']
            ),
            getFineTuningModelList: () => ipcRenderer.invoke(
                'ai', ['getFineTuningModelList']
            ),
            analyzeDocumentContent: (uuid, merge) => ipcRenderer.invoke(
                'ai', ['analyzeDocumentContent', uuid, merge]
            ),
            prepareConversationContext: (uuid) => ipcRenderer.invoke(
                'ai', ['prepareConversationContext', uuid]
            ),
            composeResponse: (uuid) => ipcRenderer.invoke(
                'ai', ['composeResponse', uuid]
            ),
            prepareAnswerFromDocument: (question, uuid) => ipcRenderer.invoke(
                'ai', ['prepareAnswerFromDocument', question, uuid]
            ),
            fineTuneQuestion: (uuid, data) => ipcRenderer.invoke(
                'ai', ['fineTuneQuestion', uuid, data]
            )
        },
        conversations: {
            getList: (page, limit) => ipcRenderer.invoke(
                'conversations', ['getList', page, limit]
            ),
            pull: () => ipcRenderer.invoke(
                'conversations', ['pull']
            ),
            reply: (uuid, answer) => ipcRenderer.invoke(
                'conversations', ['reply', uuid, answer]
            ),
            createFromText: (text) => ipcRenderer.invoke(
                'conversations', ['createFromText', text]
            ),
            read: (uuid) => ipcRenderer.invoke(
                'conversations', ['read', uuid]
            ),
            getTopicList: (uuid) => ipcRenderer.invoke(
                'conversations', ['getTopicList', uuid]
            ),
            deleteTopic: (uuid, question) => ipcRenderer.invoke(
                'conversations', ['deleteTopic', uuid, question]
            ),
            addTopic: (uuid, data) => ipcRenderer.invoke(
                'conversations', ['addTopic', uuid, data]
            ),
            update: (uuid, data) => ipcRenderer.invoke(
                'conversations', ['update', uuid, data]
            ),
            delete: (uuid) => ipcRenderer.invoke(
                'conversations', ['delete', uuid]
            ),
            addMessage: (uuid, data) => ipcRenderer.invoke(
                'conversations', ['addMessage', uuid, data]
            ),
            deleteMessage: (uuid, messageId) => ipcRenderer.invoke(
                'conversations', ['deleteMessage', uuid, messageId]
            ),
            updateMessage: (uuid, messageId, data) => ipcRenderer.invoke(
                'conversations', ['updateMessage', uuid, messageId, data]
            ),
            updateStatus: (uuid, status) => ipcRenderer.invoke(
                'conversations', ['updateStatus', uuid, status]
            ),
        },
        tuning: {
            getTuningList: (page, limit) => ipcRenderer.invoke(
                'tuning', ['getTuningList', page, limit]
            ),
            createTuning: () => ipcRenderer.invoke(
                'tuning', ['createTuning']
            ),
            readTuning: (uuid) => ipcRenderer.invoke(
                'tuning', ['readTuning', uuid]
            ),
            readTuningEvents: (uuid) => ipcRenderer.invoke(
                'tuning', ['readTuningEvents', uuid]
            ),
            updateTuning: (uuid, data) => ipcRenderer.invoke(
                'tuning', ['updateTuning', uuid, data]
            ),
            deleteTuning: (uuid, deleteCurriculum) => ipcRenderer.invoke(
                'tuning', ['deleteTuning', uuid, deleteCurriculum]
            ),
            addCurriculumToTuning: (uuid, curriculum) => ipcRenderer.invoke(
                'tuning', ['addCurriculumToTuning', uuid, curriculum]
            ),
            bulkCurriculumUploadToTuning: (uuid, csvPath, skipFirstColumn) => ipcRenderer.invoke(
                'tuning', ['bulkCurriculumUploadToTuning', uuid, csvPath, skipFirstColumn]
            ),
            deleteCurriculumFromTuning: (uuid, curriculum, del) => ipcRenderer.invoke(
                'tuning', ['deleteCurriculumFromTuning', uuid, curriculum, del]
            ),
            offloadBatch: (uuid) => ipcRenderer.invoke(
                'tuning', ['offloadBatch', uuid]
            )
        },
        addons: {
            getAddons: (page, limit) => ipcRenderer.invoke(
                'addons', ['getAddons', page, limit]
            ),
            readAddon: (path) => ipcRenderer.invoke(
                'addons', ['readAddon', path]
            )
        },
        email: {
            redirectToAuth: () => ipcRenderer.invoke(
                'email', ['redirectToAuth']
            )
        }
    }
);