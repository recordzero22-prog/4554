import React, { useState } from 'react';
import { Terminal, Play, Clock, Check, AlertCircle, Copy, Code2 } from 'lucide-react';
import { KNOWN_MCP_TOOLS, createRpcRequest } from '../core/mcpProtocol';
import { MCPResult } from '../types';

interface ManualMCPPanelProps {
  onExecuteTool: (tool: string, args: Record<string, unknown>) => MCPResult;
}

export const ManualMCPPanel: React.FC<ManualMCPPanelProps> = ({ onExecuteTool }) => {
  const [selectedToolName, setSelectedToolName] = useState<string>('Shell');
  const [jsonInput, setJsonInput] = useState<string>(
    JSON.stringify({ tool: 'Shell', arguments: { command: 'Get-Date' } }, null, 2)
  );
  const [output, setOutput] = useState<string>('Нажмите "Выполнить JSON-RPC" для отправки команды в winremote-mcp...');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [lastRpcRequest, setLastRpcRequest] = useState<unknown | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const presets = [
    {
      label: 'Get-Date (PowerShell)',
      data: { tool: 'Shell', arguments: { command: 'Get-Date' } },
    },
    {
      label: 'FileWrite (hello.py)',
      data: {
        tool: 'FileWrite',
        arguments: {
          path: 'hello.py',
          content: 'print("Hello from Autonomous MCP")\n',
        },
      },
    },
    {
      label: 'python hello.py',
      data: { tool: 'Shell', arguments: { command: 'python hello.py' } },
    },
    {
      label: 'wsl_exec (uname -a)',
      data: { tool: 'wsl_exec', arguments: { command: 'uname -a' } },
    },
    {
      label: 'ProcessList',
      data: { tool: 'ProcessList', arguments: { filter: 'python' } },
    },
    {
      label: 'Unity: Create GameObject',
      data: {
        tool: 'Unity_CreateGameObject',
        arguments: { name: 'Player_Agent', components: 'Rigidbody,BoxCollider' },
      },
    },
    {
      label: 'FileList (/workspace)',
      data: { tool: 'FileList', arguments: { directory: '.' } },
    },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSelectedToolName(preset.data.tool);
    setJsonInput(JSON.stringify(preset.data, null, 2));
  };

  const handleExecute = () => {
    try {
      const payload = JSON.parse(jsonInput);
      const toolName = payload.tool || selectedToolName;
      const toolArgs = payload.arguments || {};

      const rpcReq = createRpcRequest('tools/call', { name: toolName, arguments: toolArgs });
      setLastRpcRequest(rpcReq);

      const start = performance.now();
      const res = onExecuteTool(toolName, toolArgs);
      const duration = Math.round(performance.now() - start);
      setLastLatency(res.executionTimeMs ?? duration);

      const fullResponse = {
        jsonrpc: '2.0',
        id: rpcReq.id,
        result: {
          ok: res.ok,
          content: [
            {
              type: 'text',
              text: res.result,
            },
          ],
        },
      };

      setOutput(JSON.stringify(fullResponse, null, 2));
    } catch (err) {
      setOutput(`Ошибка парсинга или исполнения: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
      {/* Header */}
      <div className="panel-header bg-[#161b22] border border-[#30363d] rounded-lg p-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          <span>Прямой вызов инструментов MCP (JSON-RPC 2.0)</span>
        </h2>
        <p className="text-xs text-[#8b949e] mt-1">
          Отправка прямых запросов к локальному шлюзу winremote-mcp или mcp-for-unity без участия LLM агентов.
        </p>

        {/* Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 text-xs">
          <span className="text-[#8b949e] text-[11px] font-medium mr-1 shrink-0">Пресеты:</span>
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => handleSelectPreset(p)}
              className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] text-[11px] cursor-pointer whitespace-nowrap transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & Execution Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
        {/* Left: Input Payload */}
        <div className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-blue-400" />
              <span>JSON-RPC Параметры вызова</span>
            </span>

            <select
              value={selectedToolName}
              onChange={e => {
                const name = e.target.value;
                setSelectedToolName(name);
                setJsonInput(JSON.stringify({ tool: name, arguments: {} }, null, 2));
              }}
              className="bg-[#0d1117] border border-[#30363d] text-white text-xs px-2 py-1 rounded focus:outline-none"
            >
              {KNOWN_MCP_TOOLS.map(t => (
                <option key={t.name} value={t.name}>
                  {t.name} ({t.category})
                </option>
              ))}
            </select>
          </div>

          <textarea
            id="manual-input"
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            rows={10}
            className="flex-1 w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 font-mono text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
            placeholder='{"tool":"Shell","arguments":{"command":"Get-Date"}}'
          />

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-[#8b949e]">Эндпоинт: http://127.0.0.1:8090/mcp</span>
            <button
              id="manual-execute"
              onClick={handleExecute}
              className="btn-primary flex items-center gap-2 bg-[#238636] hover:bg-[#2ea043] text-white font-bold px-4 py-2 rounded-md shadow transition-colors cursor-pointer text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Выполнить JSON-RPC</span>
            </button>
          </div>
        </div>

        {/* Right: Output and Response */}
        <div className="flex flex-col bg-[#161b22] border border-[#30363d] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#8b949e] uppercase tracking-wider">
                Ответ сервера (JSON-RPC)
              </span>
              {lastLatency !== null && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                  <Clock className="w-3 h-3" />
                  {lastLatency} ms
                </span>
              )}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-white px-2 py-1 rounded bg-[#21262d] border border-[#30363d] cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Скопировано' : 'Копировать'}</span>
            </button>
          </div>

          <pre
            id="manual-output"
            className="log-panel flex-1 bg-[#0d1117] border border-[#30363d] rounded p-3 font-mono text-xs text-[#c9d1d9] overflow-auto whitespace-pre-wrap select-text leading-relaxed"
          >
            {output}
          </pre>
        </div>
      </div>
    </div>
  );
};
