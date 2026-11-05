/**
 * @file main.cjs
 * Electron Main Process для MCP Universal Studio.
 * Включает нативный webviewTag: true для обхода CSP и встраивания веб-чатов (DeepSeek, ChatGPT, Claude),
 * автозапуск локального моста winremote-mcp на порту 8090 и нативное окно с темной темой.
 */

const { app, BrowserWindow, ipcMain, shell, Menu, Tray } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let mcpBridgeProcess = null;

// Порт для winremote-mcp
const MCP_PORT = 8090;

/**
 * Проверка активности winremote-mcp на порту 8090
 */
function checkMcpRunning(port = MCP_PORT) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/mcp',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: 1500,
      },
      (res) => {
        resolve(true);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
    req.end();
  });
}

/**
 * Автоматический запуск winremote-mcp.exe если файл существует в папке bridge/
 */
async function ensureMcpBridge() {
  const isRunning = await checkMcpRunning(MCP_PORT);
  if (isRunning) {
    console.log(`[MCP Bridge] Служба winremote-mcp уже активна на порту ${MCP_PORT}.`);
    return;
  }

  const exePath = path.join(app.getAppPath(), 'bridge', 'winremote-mcp.exe');
  const fs = require('fs');

  if (fs.existsSync(exePath)) {
    console.log(`[MCP Bridge] Запуск службы ${exePath} на порту ${MCP_PORT}...`);
    try {
      mcpBridgeProcess = spawn(exePath, ['--enable-all', '--host', '127.0.0.1', '--port', String(MCP_PORT)], {
        detached: false,
        stdio: 'ignore',
        windowsHide: true,
      });

      mcpBridgeProcess.on('error', (err) => {
        console.warn('[MCP Bridge] Сбой запуска winremote-mcp:', err.message);
      });
    } catch (e) {
      console.warn('[MCP Bridge] Не удалось запустить winremote-mcp:', e);
    }
  } else {
    console.log('[MCP Bridge] bridge/winremote-mcp.exe не найден. Используется внешний фоновый мост.');
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'MCP Universal Studio v2 — Legendary Orchestrator',
    backgroundColor: '#0d1117',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // КРИТИЧНО: разрешает нативный тег <webview> для обхода CSP и встраивания чатов DeepSeek/ChatGPT
      allowRunningInsecureContent: false,
      webSecurity: true,
    },
    show: false,
  });

  // Открытие ссылок с target="_blank" во внешнем браузере по умолчанию
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // В собранном приложении загружаем локальный index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Запрет повторного экземпляра приложения (Single Instance Lock)
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

  app.whenReady().then(async () => {
    await ensureMcpBridge();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (mcpBridgeProcess) {
    try {
      mcpBridgeProcess.kill();
    } catch {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
