const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    validateKey: (key) => ipcRenderer.invoke('validate-key', key),
    startScan: (key) => ipcRenderer.send('start-scan', key),
    onScanProgress: (callback) => ipcRenderer.on('scan-progress', (_event, value) => callback(value)),
    onScanComplete: (callback) => ipcRenderer.on('scan-complete', (_event, value) => callback(value))
});
