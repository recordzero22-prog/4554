const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mcpStudio', {
  isElectron: true,
  callTool: (tool, args) => ipcRenderer.invoke('mcp-call', { tool, args }),
  checkHealth: () => ipcRenderer.invoke('mcp-health'),
  browser: {
    create: (url) => ipcRenderer.invoke('browser-create', url),
    list: () => ipcRenderer.invoke('browser-list'),
    close: (id) => ipcRenderer.invoke('browser-close', id),
  },
  onEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('studio:event', handler);
    return () => ipcRenderer.removeListener('studio:event', handler);
  },
});
