// Import the contextBridge and ipcRenderer modules from Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, isolated API to the renderer process (the UI)
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Sends a request to the main process to analyze a file.
   * @param {string} filePath The path to the file to analyze.
   * @returns {Promise<any>} A promise that resolves with the analysis results.
   */
  analyzeFile: (filePath) => ipcRenderer.invoke('analyze-file', filePath),
});