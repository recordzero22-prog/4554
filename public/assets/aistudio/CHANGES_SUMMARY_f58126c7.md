# Summary of changes for MCP Universal Studio (project 4554)

Project path: `C:\Users\ВЕРА\Desktop\4554`

This document describes all changes made by the previous assistant so another agent can continue without losing context.

## 1) npm dependencies / build

- `npm install` completed successfully.
- `package.json` changes:
  - `esbuild` raised to `^0.28.0` to resolve dependency conflict with Vite 8.
  - Added scripts:
    - `"test": "node --import tsx/esm --test \"src/**/*.test.ts\""`
  - `npm run lint` and `npm test` pass.
  - `npm run build` passes without chunk-size warnings (chunk warning limit set to 1024).
- Vite dev runs on port 3000:
  - `npm run dev`

## 2) Real MCP client instead of simulation

New file: `src/core/realMcpClient.ts`

- Implemented `McpClient` class with per-instance `sessionId`.
- Connects to Streamable HTTP MCP endpoint:
  - default `http://127.0.0.1:8090/mcp`
  - browser dev uses Vite proxy `/mcp`
  - Electron/file mode uses direct URL
- Handshake:
  - `initialize` with 10-second AbortController timeout
  - returns `MCP handshake timeout` on AbortError
- `callTool(name, args)`:
  - JSON-RPC 2.0 `tools/call`
  - validates Shell / FileWrite / FileRead / FileList args locally
  - retries on network errors and 5xx with backoff (500ms, 1000ms)
  - no retry on 4xx
  - handles:
    - connection failure -> `MCP Server недоступен. Запустите winremote-mcp на порту 8090.`
    - `isError:true`
    - JSON/SSE parsing
  - parses SSE `data:` frames
  - exported singleton: `realMcpClient`
  - allows new instance creation through `new McpClient()`

## 3) Sandbox engine changed from simulation to real MCP

File: `src/core/sandboxEngine.ts`

- `executeTool(name, args)` is now `async`.
- GameDev tools (`Unity_*`, `Godot_*`, `Blender_*`, `Rigging_*`, `Anim_*`, `Skyrim_*`) still simulated with comment:
  `// TODO: подключить реальный MCP для GameDev`
- Legacy tool names normalized:
  - `ProcessList` -> `ListProcesses`
  - `FileList.directory` -> `FileList.path`
- Real MCP calls for Shell, FileWrite, FileRead, FileList, wsl_exec, etc.
- After file operations calls real `FileList` for best-effort sync.
- Added `syncFilesFromMcp(directory)`.

## 4) UI updated for async tool execution

Files:
- `src/App.tsx`
- `src/components/ManualMCPPanel.tsx`
- `src/components/GamedevToolsPanel.tsx`
- `src/components/WorkspaceFilesPanel.tsx`

- Components adapted to `Promise<MCPResult>`.
- `handleExecuteManualTool` in App is async.
- Manual panel execution shows `Выполняется...` and disables button while running.
- Workspace file execution awaits result.
- DAG execution loop (`submitTask`) awaits all real MCP calls.
- App lazily loads heavy components with `React.lazy` + `Suspense`:
  - CyberArenaGame
  - GamedevToolsPanel
  - GeminiAiHub
  - ModelPoolPanel
  - BrowserPanel
  - SetupGuidePanel

## 5) Browser panel replacing simulated chat tabs

New file: `src/components/BrowserPanel.tsx`

- Allows entering any URL (example: `https://chat.deepseek.com`).
- Opens a tab with iframe (browser mode) or webview (Electron mode).
- Tab list with close buttons.
- External link option.
- Warning for iframe limitations.

Files changed:
- `src/components/Sidebar.tsx`:
  - `TabId` changed: removed separate `deepseek`, `chatgpt`, `fichi`
  - added `browser`
  - workspaces section now contains `Браузер`
  - added `Globe` icon import
- `src/App.tsx`:
  - renders `BrowserPanel` on `browser` tab
  - removed `EmbeddedChatPanel` usage from App

Note: `EmbeddedChatPanel.tsx` is still in the project but no longer used by App.

## 6) Vite / MCP routing and build config

File: `vite.config.ts`

- Added dev proxy:
  - `/mcp` -> `http://127.0.0.1:8090`
  - `changeOrigin: true`
- Added `build.chunkSizeWarningLimit: 1024` to avoid warnings from the 3D bundle.

## 7) OpenCode configuration for reference

File: `opencode.json`

- Remote MCP config:
  - type: `remote`
  - URL: `http://127.0.0.1:8090/mcp`

## 8) Desktop shortcut

Created:
- `C:\Users\ВЕРА\Desktop\MCP Universal Studio.lnk`
- Starts dev server via `npm run dev`

## 9) Test changes

File: `src/core/core.test.ts`

- Updated sandbox tests to work with async tool execution.
- Network-dependent Shell command scenario removed from the second test.
- Tests pass with:
  `node --import tsx/esm --test "src/**/*.test.ts"`

## 10) Verification results

- `npm run lint`: 0 errors.
- `npm test`: 20/20 passing.
- `npm run build`: successful, no size warnings.
- Manual MCP test:
  - `Get-Date` returns real system date.
  - `FileWrite` path `C:\Users\ВЕРА\Desktop\4554\workspace\test.txt` creates a real file.
- Browser side:
  - In-browser iframe loading of sites with anti-bot protection (DeepSeek/ChatGPT/Claude) is blocked by Cloudflare/CSP. This is the current limitation of the browser/hosted mode.

## 11) Important limitation / next work

The browser-hosted preview cannot reliably embed chat sites that use Cloudflare anti-bot/CSP:
- DeepSeek shows `Max challenge attempts exceeded...` inside iframe.
- The same applies to ChatGPT/Claude.
- Workaround in current app: use external link button.
- For a true embedded browser, the app needs to run as Electron with `<webview>` and `webviewTag: true`.

## Suggested next task for another assistant

1. Convert Vite app to Electron desktop app:
   - add Electron main process with `webviewTag: true`
   - detect Electron in renderer
   - lazy-load and frame DeepSeek/ChatGPT/Claude in `webview`
2. Optionally add a local proxy for sites that can be framed.
3. Keep all existing React UI and MCP logic.
4. Re-test:
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - manual Get-Date and FileWrite
   - Browser tab loading DeepSeek`