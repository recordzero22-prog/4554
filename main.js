import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;
const managedWebviews = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0d1117',
    title: 'MCP Universal Studio',
    show: false,
    webPreferences: {
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links safely in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000').catch(() => {
      // If dev server not yet up, load build dist if available
      const indexPath = path.join(__dirname, 'dist', 'index.html');
      if (fs.existsSync(indexPath)) {
        mainWindow.loadFile(indexPath);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(distPath)) {
      mainWindow.loadFile(distPath);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Setup
function setupIpcHandlers() {
  // Task 2.1: Real MCP Client in Main Process
  ipcMain.handle('mcp-call', async (event, { tool, args }) => {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: tool, arguments: args || {} },
    };

    try {
      const resp = await fetch('http://127.0.0.1:8090/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        return {
          ok: false,
          result: `MCP Server HTTP ${resp.status}: ${resp.statusText}`,
        };
      }

      const text = await resp.text();
      // Parse SSE if response contains "data: {...}"
      const dataMatch = text.match(/^data:\s*(\{.*\})$/m);
      const json = dataMatch ? JSON.parse(dataMatch[1]) : JSON.parse(text);

      if (json.error) {
        return { ok: false, result: json.error.message || JSON.stringify(json.error) };
      }

      const content = json.result?.content || [];
      const out = content
        .filter(c => c && c.type === 'text')
        .map(c => c.text)
        .join('\n');

      return {
        ok: !json.result?.isError,
        result: out || JSON.stringify(json.result || {}),
      };
    } catch (err) {
      return {
        ok: false,
        result: 'MCP Server недоступен. Запустите winremote-mcp.exe на http://127.0.0.1:8090/mcp (' + err.message + ')',
      };
    }
  });

  // Task 2.4: Health-check handler
  ipcMain.handle('mcp-health', async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch('http://127.0.0.1:8090/mcp', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return { ok: resp.ok || resp.status === 405 || resp.status === 400 };
    } catch {
      return { ok: false };
    }
  });

  // Task 1.3: Browser management IPC
  ipcMain.handle('browser-create', (event, url) => {
    const id = 'browser_' + Date.now();
    managedWebviews.set(id, { id, url, createdAt: Date.now() });
    return { id, url };
  });

  ipcMain.handle('browser-list', () => {
    return Array.from(managedWebviews.values());
  });

  ipcMain.handle('browser-close', (event, id) => {
    return managedWebviews.delete(id);
  });
}
