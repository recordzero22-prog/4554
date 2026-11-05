import React, { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, ExternalLink, ShieldCheck, FolderTree } from 'lucide-react';

export const SetupGuidePanel: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const steps = [
    {
      id: 'step0',
      num: 'Шаг 0',
      title: 'Подготовка структуры папок',
      desc: 'Открой терминал PowerShell в корне проекта (mcp-universal-studio) и выполни команду создания новой модульной структуры:',
      code: `New-Item -ItemType Directory -Force -Path "src/mcp", "src/models", "src/coordinator", "workspace", "logs"`,
      lang: 'powershell',
    },
    {
      id: 'step1',
      num: 'Шаг 1',
      title: 'Тест winremote-mcp (Фундамент)',
      desc: 'Убедимся, что winremote-mcp доступен на порту 8090 по протоколу JSON-RPC 2.0:',
      code: `# 1. Запуск в отдельном окне
Start-Process -FilePath "bridge/winremote-mcp.exe" -ArgumentList "--enable-all", "--host", "127.0.0.1", "--port", "8090"

# 2. Проверка порта 8090 через PowerShell:
Invoke-RestMethod -Uri "http://127.0.0.1:8090/mcp" -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'`,
      lang: 'powershell',
    },
    {
      id: 'step2_1',
      num: 'Шаг 2.1',
      title: 'src/mcp/MCPClient.js',
      desc: 'Модуль общения с winremote-mcp по протоколу JSON-RPC 2.0 (Streamable HTTP) и вызов команд WSL/Python:',
      code: `// src/mcp/MCPClient.js
const http = require('http');
const { spawn } = require('child_process');

class MCPClient {
    constructor({ winremoteUrl = 'http://127.0.0.1:8090/mcp' } = {}) {
        this.winremoteUrl = new URL(winremoteUrl);
        this.cachedTools = [];
        this.requestId = 1;
        this.isInitialized = false;
    }

    async _rpcCall(method, params = {}) {
        const payload = JSON.stringify({
            jsonrpc: '2.0',
            id: this.requestId++,
            method,
            params
        });

        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: this.winremoteUrl.hostname,
                port: this.winremoteUrl.port,
                path: this.winremoteUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                timeout: 35000
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.error) return reject(new Error(json.error.message || JSON.stringify(json.error)));
                        resolve(json.result);
                    } catch (e) {
                        reject(new Error(\`Невалидный JSON от MCP (\${res.statusCode}): \${data.slice(0, 200)}\`));
                    }
                });
            });

            req.on('error', (err) => reject(new Error(\`MCP HTTP Connection Error: \${err.message}\`)));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(\`Тайм-аут вызова MCP (\${method})\`));
            });
            req.write(payload);
            req.end();
        });
    }

    async initialize() {
        try {
            await this._rpcCall('initialize', {
                protocolVersion: '2024-11-05',
                capabilities: {},
                clientInfo: { name: 'mcp-universal-studio-v2', version: '2.0.0' }
            });
            const list = await this._rpcCall('tools/list', {});
            this.cachedTools = list.tools || [];
            this.isInitialized = true;
            console.log(\`[MCPClient] Подключено к winremote. Доступно инструментов: \${this.cachedTools.length}\`);
            return true;
        } catch (e) {
            console.warn('[MCPClient] winremote-mcp временно недоступен:', e.message);
            return false;
        }
    }

    async callTool(name, argumentsObj = {}) {
        if (name === 'wsl_exec' || name === 'WSL') {
            return this._runWsl(argumentsObj.command || argumentsObj.cmd);
        }
        try {
            const res = await this._rpcCall('tools/call', { name, arguments: argumentsObj });
            const content = res?.content || [];
            const textParts = content.filter(c => c.type === 'text').map(c => c.text);
            return { ok: !res?.isError, result: textParts.join('\\n') || JSON.stringify(res) };
        } catch (err) {
            return { ok: false, result: \`Ошибка выполнения \${name}: \${err.message}\` };
        }
    }

    _runWsl(command) {
        return new Promise((resolve) => {
            const child = spawn('wsl', ['-e', 'bash', '-c', command]);
            let stdout = '', stderr = '';
            child.stdout.on('data', d => stdout += d.toString());
            child.stderr.on('data', d => stderr += d.toString());
            child.on('close', code => resolve({ ok: code === 0, result: stdout || stderr || \`Код: \${code}\` }));
            child.on('error', (e) => resolve({ ok: false, result: \`Ошибка WSL: \${e.message}\` }));
        });
    }
}

module.exports = MCPClient;`,
      lang: 'javascript',
    },
    {
      id: 'step5',
      num: 'Шаг 5',
      title: 'Конфигурация opencode.json',
      desc: 'Настройка моста winremote через mcp-remote и подключение mcp-for-unity с пулом моделей UnoRouter:',
      code: `{
    "$schema": "https://opencode.ai/config.json",
    "mcp": {
        "servers": {
            "winremote": {
                "type": "local",
                "command": [
                    "npx",
                    "-y",
                    "mcp-remote",
                    "http://127.0.0.1:8090/mcp",
                    "--transport",
                    "http-only"
                ],
                "enabled": true
            },
            "unity": {
                "type": "local",
                "command": [
                    "uvx",
                    "--from",
                    "mcpforunityserver",
                    "mcp-for-unity",
                    "--transport",
                    "stdio"
                ],
                "environment": {
                    "DISABLE_TELEMETRY": "1"
                }
            }
        }
    },
    "provider": {
        "unorouter": {
            "npm": "@ai-sdk/openai-compatible",
            "name": "UnoRouter (Free)",
            "options": {
                "baseURL": "https://api.unorouter.com/v1",
                "apiKey": "sk-0MUHC25i10P7zFeUOFdbfN6BRUoe0AsoM316DwZGgfe8zw1N"
            },
            "models": {
                "deepseek-v3:free": { "name": "DeepSeek V3 Free" },
                "qwen-2.5-coder-32b:free": { "name": "Qwen 2.5 Coder 32B Free" }
            }
        }
    }
}`,
      lang: 'json',
    },
    {
      id: 'step6',
      num: 'Шаг 6',
      title: 'Запуск приложения и валидация сквозного сценария',
      desc: 'Запусти приложение и проверь автономную цепочку генерации и исполнения:',
      code: `# Запуск Electron приложения
npm start

# Валидационная цель в интерфейсе Оркестратора:
# "Создай в папке workspace файл hello.py, который выводит 'Hello from Autonomous MCP', запусти его через PowerShell и убедись, что нет ошибок."`,
      lang: 'powershell',
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="panel-header bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <span>Пошаговая инструкция «Под ключ» (Windows / PowerShell)</span>
        </h2>
        <p className="text-xs text-[#8b949e] mt-1">
          Исчерпывающий эталонный код всех файлов без сокращений, команды развертывания и конфигурации для полной автономности.
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map(step => (
          <div
            key={step.id}
            className="bg-[#161b22] border border-[#30363d] rounded-lg p-4 space-y-2.5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono text-xs font-bold">
                  {step.num}
                </span>
                <h3 className="text-xs font-bold text-white">{step.title}</h3>
              </div>

              <button
                onClick={() => copyToClipboard(step.code, step.id)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] cursor-pointer transition-colors"
              >
                {copiedId === step.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать код</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[#8b949e]">{step.desc}</p>

            <pre className="bg-[#0d1117] border border-[#30363d] rounded p-3 font-mono text-xs text-[#e6edf3] overflow-x-auto whitespace-pre leading-relaxed select-text max-h-72">
              {step.code}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};
