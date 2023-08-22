const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
    'purpleCore', {
        registry: {
            getDocumentTree: () => ipcRenderer.invoke(
                'registry', ['getDocumentTree']
            )
        }
    }
);