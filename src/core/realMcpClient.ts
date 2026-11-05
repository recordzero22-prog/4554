/**
 * @file realMcpClient.ts
 * Клиент для взаимодействия с реальным winremote-mcp сервером по протоколу JSON-RPC 2.0 (Streamable HTTP / SSE)
 * с поддержкой прямого Electron IPC моста (window.mcpStudio.callTool) и браузерного прокси.
 */

export interface McpToolCallResult {
  ok: boolean;
  result: string;
  executionTimeMs: number;
  rawJsonRpc?: unknown;
}

export class McpClient {
  private endpoint: string;
  private sessionId: string;
  private requestId: number = 1;
  private isInitialized: boolean = false;

  constructor(endpoint?: string) {
    if (endpoint) {
      this.endpoint = endpoint;
    } else if (typeof window !== 'undefined') {
      const isElectron = Boolean(
        (window as any).mcpStudio?.isElectron ||
        (window as any).isElectron ||
        (window as any).electronBridge
      );
      this.endpoint = isElectron || window.location.protocol === 'file:'
        ? 'http://127.0.0.1:8090/mcp'
        : '/mcp';
    } else {
      this.endpoint = 'http://127.0.0.1:8090/mcp';
    }

    this.sessionId = 'mcp_session_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public setEndpoint(url: string) {
    this.endpoint = url;
    this.isInitialized = false;
  }

  public isClientConnected(): boolean {
    return this.isInitialized;
  }

  /**
   * Health-check: проверка доступности winremote-mcp сервера
   */
  public async checkHealth(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).mcpStudio?.checkHealth) {
      try {
        const res = await (window as any).mcpStudio.checkHealth();
        return Boolean(res?.ok);
      } catch {
        return false;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(this.endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return resp.ok || resp.status === 405 || resp.status === 400;
    } catch {
      return false;
    }
  }

  /**
   * Handshake: Выполняет initialize с таймаутом 10 секунд (Task 5.1)
   */
  public async initialize(): Promise<{ ok: boolean; message: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: {
          name: 'mcp-universal-studio',
          version: '2.0.0',
        },
      },
    };

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': this.sessionId,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          message: `Ошибка инициализации MCP HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const text = await response.text();
      const data = this.parseResponseData(text);

      if (data.error) {
        return {
          ok: false,
          message: data.error.message || 'Ошибка RPC initialize',
        };
      }

      this.isInitialized = true;
      return {
        ok: true,
        message: 'MCP winremote успешно подключен (протокол 2024-11-05)',
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { ok: false, message: 'MCP handshake timeout' };
      }
      return {
        ok: false,
        message: 'MCP Server недоступен. Запустите winremote-mcp на порту 8090.',
      };
    }
  }

  /**
   * Вызов инструмента через Electron IPC (Task 2.2) или HTTP JSON-RPC 2.0 tools/call
   * с повторными попытками при 5xx и сбоях сети (Task 5.2).
   */
  public async callTool(name: string, args: Record<string, unknown> = {}): Promise<McpToolCallResult> {
    const start = performance.now();

    // Task 5.7: Локальная валидация базовых аргументов без отправки запроса
    const validationError = this.validateArgs(name, args);
    if (validationError) {
      return {
        ok: false,
        result: `Validation error: ${validationError}`,
        executionTimeMs: Math.round(performance.now() - start),
      };
    }

    // Task 2.2: В среде Electron вызываем инструмент через IPC в главном процессе
    if (typeof window !== 'undefined' && (window as any).mcpStudio?.callTool) {
      try {
        const ipcRes = await (window as any).mcpStudio.callTool(name, args);
        return {
          ok: Boolean(ipcRes?.ok),
          result: ipcRes?.result || '',
          executionTimeMs: Math.round(performance.now() - start),
          rawJsonRpc: ipcRes,
        };
      } catch (ipcErr: any) {
        return {
          ok: false,
          result: `IPC call error: ${ipcErr.message || String(ipcErr)}`,
          executionTimeMs: Math.round(performance.now() - start),
        };
      }
    }

    // HTTP Транспорт для веб-режима и тестирования
    const payload = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    };

    const backoffs = [500, 1000];
    let lastError = '';

    for (let attempt = 0; attempt <= backoffs.length; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Session-ID': this.sessionId,
            'Accept': 'application/json, text/event-stream',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 4xx ошибки клиентские — не ретраим
        if (response.status >= 400 && response.status < 500) {
          const errText = await response.text();
          return {
            ok: false,
            result: `MCP HTTP ${response.status}: ${errText || response.statusText}`,
            executionTimeMs: Math.round(performance.now() - start),
          };
        }

        // 5xx ошибки серверные — ретраим
        if (response.status >= 500) {
          lastError = `MCP Server Error ${response.status}: ${response.statusText}`;
          if (attempt < backoffs.length) {
            await new Promise((r) => setTimeout(r, backoffs[attempt]));
            continue;
          }
          break;
        }

        const rawText = await response.text();
        const json = this.parseResponseData(rawText);

        if (json.error) {
          return {
            ok: false,
            result: `[RPC Error ${json.error.code}]: ${json.error.message}`,
            executionTimeMs: Math.round(performance.now() - start),
            rawJsonRpc: json,
          };
        }

        const resultObj = json.result;
        let outputText = '';

        if (resultObj) {
          if (resultObj.isError) {
            const errContent = Array.isArray(resultObj.content)
              ? resultObj.content.map((c: any) => c.text || JSON.stringify(c)).join('\n')
              : JSON.stringify(resultObj);
            return {
              ok: false,
              result: errContent,
              executionTimeMs: Math.round(performance.now() - start),
              rawJsonRpc: json,
            };
          }

          if (Array.isArray(resultObj.content)) {
            outputText = resultObj.content
              .filter((c: any) => c && (typeof c === 'string' || c.type === 'text'))
              .map((c: any) => (typeof c === 'string' ? c : c.text || ''))
              .join('\n');
          } else if (typeof resultObj === 'string') {
            outputText = resultObj;
          } else {
            outputText = JSON.stringify(resultObj, null, 2);
          }
        }

        return {
          ok: true,
          result: outputText || 'Команда выполнена успешно (пустой вывод)',
          executionTimeMs: Math.round(performance.now() - start),
          rawJsonRpc: json,
        };
      } catch (err: any) {
        lastError = err.name === 'AbortError'
          ? 'MCP request timeout (10s)'
          : 'MCP Server недоступен. Запустите winremote-mcp на http://127.0.0.1:8090/mcp.';

        if (attempt < backoffs.length) {
          await new Promise((r) => setTimeout(r, backoffs[attempt]));
          continue;
        }
      }
    }

    return {
      ok: false,
      result: lastError,
      executionTimeMs: Math.round(performance.now() - start),
    };
  }

  /**
   * Парсинг ответа: поддерживает как сырой JSON, так и SSE (data: {...})
   */
  private parseResponseData(raw: string): any {
    const trimmed = raw.trim();

    // Проверка на SSE data: фреймы
    if (trimmed.startsWith('data:')) {
      const dataMatch = trimmed.match(/^data:\s*(\{.*\})$/m);
      if (dataMatch) {
        try {
          return JSON.parse(dataMatch[1]);
        } catch {
          // ignore
        }
      }

      const lines = trimmed.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const jsonStr = line.slice(5).trim();
          try {
            return JSON.parse(jsonStr);
          } catch {
            // продолжать поиск
          }
        }
      }
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return { result: trimmed };
    }
  }

  /**
   * Локальная валидация аргументов инструментов (Task 5.7)
   */
  private validateArgs(name: string, args: Record<string, unknown>): string | null {
    if (name === 'Shell' || name === 'powershell_exec' || name === 'wsl_exec') {
      const cmd = args.command || args.cmd;
      if (!cmd || typeof cmd !== 'string' || !cmd.trim()) {
        return `отсутствует или пуст обязательный параметр "command" для ${name}`;
      }
    }

    if (name === 'FileWrite') {
      if (!args.path || typeof args.path !== 'string') {
        return 'отсутствует обязательный параметр "path" для FileWrite';
      }
      if (args.content === undefined || args.content === null) {
        return 'отсутствует параметр "content" для FileWrite';
      }
    }

    if (name === 'FileRead') {
      if (!args.path || typeof args.path !== 'string') {
        return 'отсутствует обязательный параметр "path" для FileRead';
      }
    }

    if (name === 'FileList') {
      const p = args.path || args.directory;
      if (p !== undefined && typeof p !== 'string') {
        return 'параметр "path" для FileList должен быть строкой';
      }
    }

    return null;
  }
}

/**
 * Фабрика экземпляров MCP клиентов (Task 5.6)
 */
export function createMcpClient(endpoint?: string): McpClient {
  return new McpClient(endpoint);
}

/**
 * Глобальный синглтон клиента MCP
 */
export const realMcpClient = new McpClient();
