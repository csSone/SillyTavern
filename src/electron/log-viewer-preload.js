/**
 * Preload script for log viewer window
 * Exposes safe IPC communication to renderer process
 */
const { contextBridge, ipcRenderer } = require('electron');

// Store listener references to prevent duplicates
const listeners = {
    'init-logs': null,
    'new-log': null,
    'clear-logs': null,
    'export-result': null,
};

contextBridge.exposeInMainWorld('electronAPI', {
    // Log events
    onInitLogs: (callback) => {
        // Remove existing listener if any
        if (listeners['init-logs']) {
            ipcRenderer.removeListener('init-logs', listeners['init-logs']);
        }
        // Store and add new listener
        listeners['init-logs'] = (event, logs) => callback(logs);
        ipcRenderer.on('init-logs', listeners['init-logs']);
    },

    onNewLog: (callback) => {
        if (listeners['new-log']) {
            ipcRenderer.removeListener('new-log', listeners['new-log']);
        }
        listeners['new-log'] = (event, log) => callback(log);
        ipcRenderer.on('new-log', listeners['new-log']);
    },

    onClearLogs: (callback) => {
        if (listeners['clear-logs']) {
            ipcRenderer.removeListener('clear-logs', listeners['clear-logs']);
        }
        listeners['clear-logs'] = () => callback();
        ipcRenderer.on('clear-logs', listeners['clear-logs']);
    },

    onExportResult: (callback) => {
        if (listeners['export-result']) {
            ipcRenderer.removeListener('export-result', listeners['export-result']);
        }
        listeners['export-result'] = (event, result) => callback(result);
        ipcRenderer.on('export-result', listeners['export-result']);
    },

    // Remove all listeners
    removeAllListeners: (channel) => {
        if (listeners[channel]) {
            ipcRenderer.removeListener(channel, listeners[channel]);
            listeners[channel] = null;
        }
    },

    // Remove all registered listeners
    cleanup: () => {
        Object.keys(listeners).forEach(channel => {
            if (listeners[channel]) {
                ipcRenderer.removeListener(channel, listeners[channel]);
                listeners[channel] = null;
            }
        });
    },

    // Send messages
    sendShowSaveDialog: (options) => {
        ipcRenderer.send('show-save-dialog', options);
    },
});
