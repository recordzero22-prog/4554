import { MCPResult, WorkspaceFile } from '../types';
import { executeGamedevTool } from './gamedevMcpTools';

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
  private installedPackages: Set<string>;

  constructor(initialFiles: WorkspaceFile[] = INITIAL_WORKSPACE_FILES) {
    this.files = new Map();
    this.installedPackages = new Set();
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

  public executeTool(name: string, args: Record<string, unknown>): MCPResult {
    const start = performance.now();

    if (name === 'FileWrite') {
      const path = String(args.path || 'unnamed.txt');
      const content = String(args.content || '');
      this.writeFile(path, content);
      return {
        ok: true,
        result: `Успешно записан файл: ${path} (${new Blob([content]).size} bytes)`,
        executionTimeMs: Math.round(performance.now() - start),
      };
    }

    if (name === 'FileRead') {
      const path = String(args.path || '');
      const file = this.getFile(path);
      if (!file) {
        return {
          ok: false,
          result: `Ошибка: Файл "${path}" не найден в workspace`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }
      return {
        ok: true,
        result: file.content,
        executionTimeMs: Math.round(performance.now() - start),
      };
    }

    if (name === 'FileList') {
      const list = this.getFiles().map(f => `${f.isDirectory ? '[DIR] ' : '      '}${f.path} (${f.size} B)`);
      return {
        ok: true,
        result: list.join('\n') || '(Директория пуста)',
        executionTimeMs: Math.round(performance.now() - start),
      };
    }

    if (name === 'Unity_CreateGameObject' || name.startsWith('Unity_') || name.startsWith('Godot_') || name.startsWith('Blender_') || name.startsWith('Rigging_') || name.startsWith('Anim_') || name.startsWith('Skyrim_')) {
      const gamedevRes = executeGamedevTool(name, args);
      return gamedevRes;
    }

    if (name === 'Shell') {
      const cmd = String(args.command || '');
      let output = '';

      if (cmd.includes('pip install')) {
        const pkgMatch = cmd.match(/pip install\s+([a-zA-Z0-9_\-]+)/);
        const pkg = pkgMatch ? pkgMatch[1] : 'package';
        this.installedPackages.add(pkg);
        return {
          ok: true,
          result: `Collecting ${pkg}\n  Downloading ${pkg}-2.31.0-py3-none-any.whl (62 kB)\nInstalling collected packages: ${pkg}\nSuccessfully installed ${pkg}-2.31.0\nProcess finished with exit code 0`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }

      if (cmd.includes('npm install')) {
        const pkgMatch = cmd.match(/npm install\s+([a-zA-Z0-9_\-]+)/);
        const pkg = pkgMatch ? pkgMatch[1] : 'package';
        this.installedPackages.add(pkg);
        return {
          ok: true,
          result: `added 1 package, and audited 42 packages in 1s\nfound 0 vulnerabilities\nInstalled ${pkg} successfully.`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }

      if (cmd.includes('test_missing_pkg.py')) {
        if (!this.installedPackages.has('requests')) {
          return {
            ok: false,
            result: `Traceback (most recent call last):\n  File "test_missing_pkg.py", line 2, in <module>\n    import requests\nModuleNotFoundError: No module named 'requests'`,
            executionTimeMs: Math.round(performance.now() - start),
          };
        }
        return {
          ok: true,
          result: `[Python 3.11.8 Runtime]\nExecuting test_missing_pkg.py...\nRequests version: 2.31.0 (Loaded from site-packages)\nProcess finished with exit code 0`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }

      if (cmd.includes('fail_python')) {
        return {
          ok: false,
          result: `Traceback (most recent call last):\n  File "test_missing_pkg.py", line 2, in <module>\n    import requests\nModuleNotFoundError: No module named 'requests'`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }

      if (cmd.includes('fail_syntax') || cmd.includes('bad_syntax.py')) {
        return {
          ok: false,
          result: `  File "bad_syntax.py", line 4\n    def broken(\n               ^\nSyntaxError: unexpected EOF while parsing`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }

      if (cmd.includes('python')) {
        const fileMatch = cmd.match(/python\s+([a-zA-Z0-9_\-\.]+)/);
        const targetFile = fileMatch ? fileMatch[1] : null;
        if (targetFile) {
          const file = this.getFile(targetFile);
          if (file) {
            if (file.content.includes('broken(') || file.content.includes('SyntaxError')) {
              return {
                ok: false,
                result: `  File "${targetFile}", line 3\n    broken syntax here ===\n                   ^\nSyntaxError: invalid syntax`,
                executionTimeMs: Math.round(performance.now() - start),
              };
            }
            if (file.content.includes('import requests') && !this.installedPackages.has('requests')) {
              // Module error
              return {
                ok: false,
                result: `Traceback (most recent call last):\n  File "${targetFile}", line 1, in <module>\n    import requests\nModuleNotFoundError: No module named 'requests'`,
                executionTimeMs: Math.round(performance.now() - start),
              };
            }
            output = `[Python 3.11.8 Runtime]\nExecuting ${targetFile}...\n` +
              (file.content.includes('Hello from Autonomous MCP')
                ? 'Hello from Autonomous MCP\nProcess finished with exit code 0'
                : 'Script output generated successfully.\nProcess finished with exit code 0');
          } else {
            output = `python: can't open file '${targetFile}': [Errno 2] No such file or directory`;
            return {
              ok: false,
              result: output,
              executionTimeMs: Math.round(performance.now() - start),
            };
          }
        } else {
          output = `Python 3.11.8 (tags/v3.11.8:db85d51, Feb  6 2024, 22:03:32) [MSC v.1937 64 bit (AMD64)] on win32`;
        }
      } else if (cmd.includes('Get-Date')) {
        output = new Date().toUTCString();
      } else if (cmd.includes('node')) {
        output = `v20.12.2\nHello from Autonomous MCP`;
      } else if (cmd.startsWith('echo')) {
        output = cmd.replace(/^echo\s+/, '').replace(/['"]/g, '');
      } else {
        output = `PowerShell Core 7.4.2\nCommand executed: ${cmd}\nExit code: 0\nStatus: Success`;
      }

      return {
        ok: true,
        result: output,
        executionTimeMs: Math.round(performance.now() - start),
      };
    }

    return {
      ok: true,
      result: `Tool '${name}' executed successfully with params: ${JSON.stringify(args)}`,
      executionTimeMs: Math.round(performance.now() - start),
    };
  }
}
