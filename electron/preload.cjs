/**
 * @file preload.cjs
 * Preload скрипт Electron: безопасно пробрасывает флаг окружения и вспомогательные API в window.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('isElectron', true);
contextBridge.exposeInMainWorld('electronBridge', {
  platform: process.platform,
  version: process.versions.electron,
  openExternal: (url) => ipcRenderer.send('open-external', url),
  checkBridgeStatus: () => ipcRenderer.invoke('check-bridge-status'),
});

console.log('[Electron Preload] Инициализирован безопасный контекст Electron с webviewTag: true');
