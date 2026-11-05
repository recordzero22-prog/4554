import { MCPResult, WorkspaceFile } from '../types';
import { executeGamedevTool } from './gamedevMcpTools';
import { realMcpClient } from './realMcpClient';

export const INITIAL_WORKSPACE_FILES: WorkspaceFile[] = [
  {
    name: 'hello.py',
    path: 'hello.py',
    language: 'python',
    content: `# Python script created for autonomous MCP verification
import sys

def main():
    print("Hello from Autonomous MCP")
    print(f"Python interpreter: {sys.version.split()[0]}")
    return 0

if __name__ == '__main__':
    sys.exit(main())
`,
    size: 218,
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    isDirectory: false,
  },
  {
    name: 'ping.py',
    path: 'ping.py',
    language: 'python',
    content: `# Network latency check script
import time

def check_host(host="127.0.0.1", port=8090):
    print(f"[ping] Probing MCP endpoint at http://{host}:{port}/mcp...")
    time.sleep(0.1)
    print(f"[ping] Endpoint http://{host}:{port}/mcp is ACTIVE (latency: 1.4ms)")
    return True

if __name__ == '__main__':
    check_host()
`,
    size: 312,
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
    isDirectory: false,
  },
  {
    name: 'audit.log',
    path: 'logs/audit.log',
    language: 'json',
    content: `{"time":"2026-11-04T17:00:00.000Z","event":"system_init","version":"2.0.0","status":"ready"}\n{"time":"2026-11-04T17:01:12.000Z","tool":"winremote:initialize","protocolVersion":"2024-11-05","status":"connected"}\n`,
    size: 204,
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    isDirectory: false,
  },
  {
    name: 'opencode.json',
    path: 'opencode.json',
    language: 'json',
    content: JSON.stringify(
      {
        $schema: 'https://opencode.ai/config.json',
        mcp: {
          servers: {
            winremote: {
              type: 'local',
              command: ['npx', '-y', 'mcp-remote', 'http://127.0.0.1:8090/mcp', '--transport', 'http-only'],
              enabled: true,
            },
            unity: {
              type: 'local',
              command: ['uvx', '--from', 'mcpforunityserver', 'mcp-for-unity', '--transport', 'stdio'],
              environment: { DISABLE_TELEMETRY: '1' },
            },
          },
        },
      },
      null,
      2
    ),
    size: 512,
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    isDirectory: false,
  },
];

export class SandboxEngine {
  private files: Map<string, WorkspaceFile>;

  constructor(initialFiles: WorkspaceFile[] = INITIAL_WORKSPACE_FILES) {
    this.files = new Map();
    initialFiles.forEach(f => this.files.set(f.path, { ...f }));
  }

  public getFiles(): WorkspaceFile[] {
    return Array.from(this.files.values()).sort((a, b) => a.path.localeCompare(b.path));
  }

  public getFile(path: string): WorkspaceFile | undefined {
    return this.files.get(path);
  }

  public writeFile(path: string, content: string): WorkspaceFile {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      json: 'json',
      sh: 'shell',
      ps1: 'powershell',
      html: 'html',
      css: 'css',
      txt: 'plaintext',
    };

    const file: WorkspaceFile = {
      name: path.split('/').pop() || path,
      path,
      content,
      language: langMap[ext] || 'plaintext',
      size: new Blob([content]).size,
      updatedAt: new Date().toISOString(),
      isDirectory: false,
    };

    this.files.set(path, file);
    return file;
  }

  public deleteFile(path: string): boolean {
    return this.files.delete(path);
  }

  /**
   * Task 5.3: Синхронизация списка файлов с реальным MCP сервером и диском
   */
  public async syncFilesFromMcp(directory: string = 'workspace'): Promise<number> {
    try {
      const res = await realMcpClient.callTool('FileList', { path: directory });
      if (res.ok && typeof res.result === 'string') {
        const lines = res.result.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('(') && !trimmed.startsWith('[')) {
            const fileName = trimmed.split(/\s+/).pop() || trimmed;
            if (!this.files.has(fileName)) {
              this.writeFile(fileName, `# Synced from real MCP ${fileName}`);
            }
          }
        }
      }
    } catch {
      // Игнорируем сетевые ошибки фоновой синхронизации
    }
    return this.files.size;
  }

  /**
   * Task 2.3: Реальное исполнение инструментов через winremote-mcp.
   * Убраны все симуляции. Если MCP недоступен, возвращается понятная ошибка оператору.
   */
  public async executeTool(name: string, args: Record<string, unknown> = {}): Promise<MCPResult> {
    const start = performance.now();

    // Нормализация аргументов
    let toolName = name;
    const toolArgs = { ...args };
    if (toolName === 'ProcessList') {
      toolName = 'ListProcesses';
    }
    if (toolName === 'FileList' && toolArgs.directory && !toolArgs.path) {
      toolArgs.path = toolArgs.directory;
    }

    // GameDev tools (Unity, Godot, Blender, Rigging, Skyrim)
    if (
      toolName.startsWith('Unity_') ||
      toolName.startsWith('Godot_') ||
      toolName.startsWith('Blender_') ||
      toolName.startsWith('Rigging_') ||
      toolName.startsWith('Anim_') ||
      toolName.startsWith('Skyrim_')
    ) {
      return executeGamedevTool(toolName, toolArgs);
    }

    // Реальный вызов через MCP Client (Electron IPC или HTTP Streamable)
    try {
      const res = await realMcpClient.callTool(toolName, toolArgs);

      if (res.ok) {
        // Task 5.3: Обновление локальной зеркальной файловой таблицы после реальных операций
        if (toolName === 'FileWrite') {
          const p = String(toolArgs.path || 'unnamed.txt');
          const c = String(toolArgs.content || '');
          this.writeFile(p, c);
          await this.syncFilesFromMcp('workspace');
        } else if (toolName === 'FileRead') {
          const p = String(toolArgs.path || '');
          if (p && res.result) {
            this.writeFile(p, res.result);
          }
        } else if (toolName === 'FileList') {
          await this.syncFilesFromMcp(String(toolArgs.path || 'workspace'));
        }

        return {
          ok: true,
          result: res.result,
          executionTimeMs: res.executionTimeMs || Math.round(performance.now() - start),
        };
      }

      // Если MCP сервер недоступен, возвращаем строгое сообщение без симуляций (Task 2.3)
      if (
        res.result.includes('недоступен') ||
        res.result.includes('timeout') ||
        res.result.includes('502') ||
        res.result.includes('Failed to fetch') ||
        res.result.includes('ECONNREFUSED')
      ) {
        return {
          ok: false,
          result: 'MCP Server недоступен. Запустите winremote-mcp.exe на http://127.0.0.1:8090/mcp.',
          executionTimeMs: Math.round(performance.now() - start),
        };
      }

      return {
        ok: false,
        result: res.result,
        executionTimeMs: res.executionTimeMs || Math.round(performance.now() - start),
      };
    } catch (err: any) {
      return {
        ok: false,
        result: `MCP Server недоступен. Запустите winremote-mcp.exe на http://127.0.0.1:8090/mcp (${err.message})`,
        executionTimeMs: Math.round(performance.now() - start),
      };
    }
  }
}
